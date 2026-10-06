-- Migration 0008: Founder Visual CMS Overrides Table
CREATE TABLE IF NOT EXISTS public.cms_page_overrides (
  page_path TEXT PRIMARY KEY,
  overrides JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.cms_page_overrides ENABLE ROW LEVEL SECURITY;

-- Public read access so live page content overrides apply for all visitors
CREATE POLICY "Public read page overrides"
  ON public.cms_page_overrides
  FOR SELECT
  USING (true);

-- Founder, Admin, and Owner full access to upsert page overrides
CREATE POLICY "Founders can manage page overrides"
  ON public.cms_page_overrides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND LOWER(p.role) IN ('founder', 'admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND LOWER(p.role) IN ('founder', 'admin', 'owner')
    )
  );
