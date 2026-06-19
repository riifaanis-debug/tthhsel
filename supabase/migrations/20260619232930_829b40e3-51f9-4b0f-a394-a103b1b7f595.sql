CREATE TABLE IF NOT EXISTS public.group_members (
  employee_id TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO anon, authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_members readable by all" ON public.group_members;
DROP POLICY IF EXISTS "group_members insert by all" ON public.group_members;
DROP POLICY IF EXISTS "group_members delete by all" ON public.group_members;
DROP POLICY IF EXISTS "gm read" ON public.group_members;
DROP POLICY IF EXISTS "gm insert" ON public.group_members;
DROP POLICY IF EXISTS "gm delete" ON public.group_members;
CREATE POLICY "group_members readable by all" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "group_members insert by all" ON public.group_members FOR INSERT WITH CHECK (true);
CREATE POLICY "group_members delete by all" ON public.group_members FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_key TEXT NOT NULL,
  account_number TEXT,
  national_id TEXT,
  customer_name TEXT,
  phone TEXT,
  amount NUMERIC,
  product TEXT,
  debt_age TEXT,
  action TEXT,
  installment TEXT,
  is_salary BOOLEAN DEFAULT false,
  is_deceased BOOLEAN DEFAULT false,
  agent_employee_id TEXT,
  raw JSONB,
  file_month TEXT,
  imported_by TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO anon, authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_customers_customer_key ON public.customers(customer_key);
CREATE INDEX IF NOT EXISTS idx_customers_account_number ON public.customers(account_number);
CREATE INDEX IF NOT EXISTS idx_customers_national_id ON public.customers(national_id);
CREATE INDEX IF NOT EXISTS idx_customers_agent ON public.customers(agent_employee_id);
DROP POLICY IF EXISTS "customers read all" ON public.customers;
DROP POLICY IF EXISTS "customers insert all" ON public.customers;
DROP POLICY IF EXISTS "customers update all" ON public.customers;
DROP POLICY IF EXISTS "customers delete all" ON public.customers;
CREATE POLICY "customers read all" ON public.customers FOR SELECT USING (true);
CREATE POLICY "customers insert all" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "customers update all" ON public.customers FOR UPDATE USING (true);
CREATE POLICY "customers delete all" ON public.customers FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.customer_states (
  customer_key TEXT PRIMARY KEY,
  contacted BOOLEAN DEFAULT false,
  last_contacted_at TIMESTAMPTZ,
  notes TEXT,
  has_exemption BOOLEAN DEFAULT false,
  has_reschedule BOOLEAN DEFAULT false,
  default_date TEXT,
  client_status TEXT,
  edits JSONB,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_states TO anon, authenticated;
GRANT ALL ON public.customer_states TO service_role;
ALTER TABLE public.customer_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "states read all" ON public.customer_states;
DROP POLICY IF EXISTS "states insert all" ON public.customer_states;
DROP POLICY IF EXISTS "states update all" ON public.customer_states;
DROP POLICY IF EXISTS "states delete all" ON public.customer_states;
CREATE POLICY "states read all" ON public.customer_states FOR SELECT USING (true);
CREATE POLICY "states insert all" ON public.customer_states FOR INSERT WITH CHECK (true);
CREATE POLICY "states update all" ON public.customer_states FOR UPDATE USING (true);
CREATE POLICY "states delete all" ON public.customer_states FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_key TEXT NOT NULL,
  text TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notes TO anon, authenticated;
GRANT ALL ON public.customer_notes TO service_role;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_customer_notes_key ON public.customer_notes(customer_key);
DROP POLICY IF EXISTS "notes read all" ON public.customer_notes;
DROP POLICY IF EXISTS "notes insert all" ON public.customer_notes;
DROP POLICY IF EXISTS "notes update all" ON public.customer_notes;
DROP POLICY IF EXISTS "notes delete all" ON public.customer_notes;
CREATE POLICY "notes read all" ON public.customer_notes FOR SELECT USING (true);
CREATE POLICY "notes insert all" ON public.customer_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "notes update all" ON public.customer_notes FOR UPDATE USING (true);
CREATE POLICY "notes delete all" ON public.customer_notes FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.contact_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_key TEXT NOT NULL,
  channel TEXT,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_logs TO anon, authenticated;
GRANT ALL ON public.contact_logs TO service_role;
ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_contact_logs_key ON public.contact_logs(customer_key);
DROP POLICY IF EXISTS "logs read all" ON public.contact_logs;
DROP POLICY IF EXISTS "logs insert all" ON public.contact_logs;
DROP POLICY IF EXISTS "logs update all" ON public.contact_logs;
DROP POLICY IF EXISTS "logs delete all" ON public.contact_logs;
CREATE POLICY "logs read all" ON public.contact_logs FOR SELECT USING (true);
CREATE POLICY "logs insert all" ON public.contact_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "logs update all" ON public.contact_logs FOR UPDATE USING (true);
CREATE POLICY "logs delete all" ON public.contact_logs FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.collector_permissions (
  employee_id TEXT PRIMARY KEY,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_calculate BOOLEAN NOT NULL DEFAULT true,
  can_export BOOLEAN NOT NULL DEFAULT true,
  can_manage BOOLEAN NOT NULL DEFAULT false,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collector_permissions TO anon, authenticated;
GRANT ALL ON public.collector_permissions TO service_role;
ALTER TABLE public.collector_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perms read all" ON public.collector_permissions;
DROP POLICY IF EXISTS "perms insert all" ON public.collector_permissions;
DROP POLICY IF EXISTS "perms update all" ON public.collector_permissions;
DROP POLICY IF EXISTS "perms delete all" ON public.collector_permissions;
CREATE POLICY "perms read all" ON public.collector_permissions FOR SELECT USING (true);
CREATE POLICY "perms insert all" ON public.collector_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "perms update all" ON public.collector_permissions FOR UPDATE USING (true);
CREATE POLICY "perms delete all" ON public.collector_permissions FOR DELETE USING (true);

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