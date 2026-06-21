
CREATE TABLE public.wallet_backups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  account_count integer NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  customers_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  customer_states_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  customer_notes_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  contact_logs_data jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Admin-only via server (service_role). No anon/authenticated access.
GRANT ALL ON public.wallet_backups TO service_role;
ALTER TABLE public.wallet_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "backups service only deny all" ON public.wallet_backups FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.create_wallet_backup(_created_by text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  v_count integer;
  v_total numeric;
  v_customers jsonb;
  v_states jsonb;
  v_notes jsonb;
  v_logs jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(c.*)), '[]'::jsonb), COUNT(*), COALESCE(SUM(amount),0)
    INTO v_customers, v_count, v_total FROM public.customers c;
  SELECT COALESCE(jsonb_agg(to_jsonb(s.*)), '[]'::jsonb) INTO v_states FROM public.customer_states s;
  SELECT COALESCE(jsonb_agg(to_jsonb(n.*)), '[]'::jsonb) INTO v_notes FROM public.customer_notes n;
  SELECT COALESCE(jsonb_agg(to_jsonb(l.*)), '[]'::jsonb) INTO v_logs FROM public.contact_logs l;

  INSERT INTO public.wallet_backups (created_by, account_count, total_amount, customers_data, customer_states_data, customer_notes_data, contact_logs_data)
  VALUES (_created_by, v_count, v_total, v_customers, v_states, v_notes, v_logs)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_wallet_backup(_backup_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b public.wallet_backups%ROWTYPE;
BEGIN
  SELECT * INTO b FROM public.wallet_backups WHERE id = _backup_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Backup not found'; END IF;

  TRUNCATE TABLE public.contact_logs, public.customer_notes, public.customer_states, public.customers RESTART IDENTITY;

  INSERT INTO public.customers SELECT * FROM jsonb_populate_recordset(NULL::public.customers, b.customers_data);
  INSERT INTO public.customer_states SELECT * FROM jsonb_populate_recordset(NULL::public.customer_states, b.customer_states_data);
  INSERT INTO public.customer_notes SELECT * FROM jsonb_populate_recordset(NULL::public.customer_notes, b.customer_notes_data);
  INSERT INTO public.contact_logs SELECT * FROM jsonb_populate_recordset(NULL::public.contact_logs, b.contact_logs_data);
END;
$$;
