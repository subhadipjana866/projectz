-- ============================================================================
-- CollabHub — Row Level Security policies for core tables
-- ----------------------------------------------------------------------------
-- The frontend reads/writes these tables directly with the anon key, so RLS is
-- the only thing stopping one user from editing or deleting another user's data.
--
-- Model:
--   * Everyone can READ profiles, creators/brands, projects and campaigns
--     (needed for Search, the feed, and viewing other profiles).
--   * A user can only WRITE their own user row, and only create/edit/delete
--     projects/campaigns they own (via their creators/brands row).
--
-- Server code uses the service-role key, which bypasses RLS entirely, so these
-- policies do not affect the backend.
--
-- Idempotent: safe to run multiple times. Run in the Supabase SQL editor.
-- (collaboration_requests / chat_messages already have their own policies from
--  collaboration_migration.sql and are left untouched here.)
-- ============================================================================

-- Remove the placeholder read policies created by core_tables_migration.sql so
-- we don't end up with duplicates; this file is now the source of truth.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','creators','brands','projects','campaigns'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read %1$s" ON public.%1$I', t);
  END LOOP;
END $$;

-- ─── users ─────────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_all ON public.users;
CREATE POLICY users_select_all ON public.users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS users_insert_self ON public.users;
CREATE POLICY users_insert_self ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self ON public.users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ─── creators ──────────────────────────────────────────────────────────────
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creators_select_all ON public.creators;
CREATE POLICY creators_select_all ON public.creators
  FOR SELECT USING (true);

DROP POLICY IF EXISTS creators_insert_self ON public.creators;
CREATE POLICY creators_insert_self ON public.creators
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ─── brands ────────────────────────────────────────────────────────────────
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brands_select_all ON public.brands;
CREATE POLICY brands_select_all ON public.brands
  FOR SELECT USING (true);

DROP POLICY IF EXISTS brands_insert_self ON public.brands;
CREATE POLICY brands_insert_self ON public.brands
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ─── projects (owned through creators) ─────────────────────────────────────
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_select_all ON public.projects;
CREATE POLICY projects_select_all ON public.projects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS projects_insert_own ON public.projects;
CREATE POLICY projects_insert_own ON public.projects
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS projects_update_own ON public.projects;
CREATE POLICY projects_update_own ON public.projects
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS projects_delete_own ON public.projects;
CREATE POLICY projects_delete_own ON public.projects
  FOR DELETE USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

-- ─── campaigns (owned through brands) ──────────────────────────────────────
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaigns_select_all ON public.campaigns;
CREATE POLICY campaigns_select_all ON public.campaigns
  FOR SELECT USING (true);

DROP POLICY IF EXISTS campaigns_insert_own ON public.campaigns;
CREATE POLICY campaigns_insert_own ON public.campaigns
  FOR INSERT WITH CHECK (
    brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS campaigns_update_own ON public.campaigns;
CREATE POLICY campaigns_update_own ON public.campaigns
  FOR UPDATE USING (
    brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS campaigns_delete_own ON public.campaigns;
CREATE POLICY campaigns_delete_own ON public.campaigns
  FOR DELETE USING (
    brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid())
  );

-- Done.
