CREATE TABLE public.group_members (
  employee_id TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO anon, authenticated;
GRANT ALL ON public.group_members TO service_role;

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_members readable by all"
  ON public.group_members FOR SELECT
  USING (true);

CREATE POLICY "group_members insert by all"
  ON public.group_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "group_members delete by all"
  ON public.group_members FOR DELETE
  USING (true);