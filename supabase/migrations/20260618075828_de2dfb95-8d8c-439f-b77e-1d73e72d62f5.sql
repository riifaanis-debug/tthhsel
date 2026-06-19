
CREATE OR REPLACE FUNCTION public.truncate_wallet_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE public.contact_logs, public.customer_notes, public.customer_states, public.customers RESTART IDENTITY;
END;
$$;

REVOKE ALL ON FUNCTION public.truncate_wallet_tables() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.truncate_wallet_tables() TO service_role;
