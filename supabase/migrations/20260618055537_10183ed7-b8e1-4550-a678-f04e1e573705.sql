
CREATE TABLE public.customers (
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
CREATE INDEX idx_customers_customer_key ON public.customers(customer_key);
CREATE INDEX idx_customers_account_number ON public.customers(account_number);
CREATE INDEX idx_customers_national_id ON public.customers(national_id);
CREATE INDEX idx_customers_agent ON public.customers(agent_employee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO anon, authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers read all" ON public.customers FOR SELECT USING (true);
CREATE POLICY "customers insert all" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "customers update all" ON public.customers FOR UPDATE USING (true);
CREATE POLICY "customers delete all" ON public.customers FOR DELETE USING (true);

CREATE TABLE public.customer_states (
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
CREATE POLICY "states read all" ON public.customer_states FOR SELECT USING (true);
CREATE POLICY "states insert all" ON public.customer_states FOR INSERT WITH CHECK (true);
CREATE POLICY "states update all" ON public.customer_states FOR UPDATE USING (true);
CREATE POLICY "states delete all" ON public.customer_states FOR DELETE USING (true);

CREATE TABLE public.customer_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_key TEXT NOT NULL,
  text TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_notes_key ON public.customer_notes(customer_key);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notes TO anon, authenticated;
GRANT ALL ON public.customer_notes TO service_role;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes read all" ON public.customer_notes FOR SELECT USING (true);
CREATE POLICY "notes insert all" ON public.customer_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "notes update all" ON public.customer_notes FOR UPDATE USING (true);
CREATE POLICY "notes delete all" ON public.customer_notes FOR DELETE USING (true);

CREATE TABLE public.contact_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_key TEXT NOT NULL,
  channel TEXT,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contact_logs_key ON public.contact_logs(customer_key);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_logs TO anon, authenticated;
GRANT ALL ON public.contact_logs TO service_role;
ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs read all" ON public.contact_logs FOR SELECT USING (true);
CREATE POLICY "logs insert all" ON public.contact_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "logs update all" ON public.contact_logs FOR UPDATE USING (true);
CREATE POLICY "logs delete all" ON public.contact_logs FOR DELETE USING (true);
