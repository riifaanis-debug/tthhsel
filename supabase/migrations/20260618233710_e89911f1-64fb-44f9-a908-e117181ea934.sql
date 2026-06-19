CREATE TABLE public.collector_permissions (
  employee_id text PRIMARY KEY,
  can_view boolean NOT NULL DEFAULT true,
  can_calculate boolean NOT NULL DEFAULT true,
  can_export boolean NOT NULL DEFAULT true,
  can_manage boolean NOT NULL DEFAULT false,
  updated_by text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collector_permissions TO anon, authenticated;
GRANT ALL ON public.collector_permissions TO service_role;

ALTER TABLE public.collector_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perms read all" ON public.collector_permissions FOR SELECT USING (true);
CREATE POLICY "perms insert all" ON public.collector_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "perms update all" ON public.collector_permissions FOR UPDATE USING (true);
CREATE POLICY "perms delete all" ON public.collector_permissions FOR DELETE USING (true);