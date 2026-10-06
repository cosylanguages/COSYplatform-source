-- Migration 0008: Founder CMS Page Overrides Table and RLS Access Control Policies
--
-- This migration creates the cms_page_overrides table to store live page content overrides
-- and configures Row-Level Security policies allowing public read access for all visitors,
-- and full edit/upsert permissions for founders, admins, and owners.

CREATE TABLE IF NOT EXISTS public.cms_page_overrides (
  page_path TEXT PRIMARY KEY,
  content_html TEXT,
  overrides JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.cms_page_overrides ENABLE ROW LEVEL SECURITY;

-- 1. Public SELECT Policy: Allows all visitors (anonymous & authenticated) to fetch live page content overrides
DROP POLICY IF EXISTS "Public can view cms_page_overrides" ON public.cms_page_overrides;
CREATE POLICY "Public can view cms_page_overrides"
  ON public.cms_page_overrides
  FOR SELECT
  USING (true);

-- 2. Founder & Admin ALL Policy: Grants founders, admins, and owners full permission to insert/update/delete overrides
DROP POLICY IF EXISTS "Founders and admins can upsert cms_page_overrides" ON public.cms_page_overrides;
CREATE POLICY "Founders and admins can upsert cms_page_overrides"
  ON public.cms_page_overrides
  FOR ALL
  USING (
    public.is_founder() OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
      AND LOWER(public.profiles.role) IN ('founder', 'admin', 'owner')
    )
  )
  WITH CHECK (
    public.is_founder() OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
      AND LOWER(public.profiles.role) IN ('founder', 'admin', 'owner')
    )
  );
