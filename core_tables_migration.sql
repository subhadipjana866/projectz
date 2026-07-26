-- ============================================================================
-- CollabHub — Core Tables Auto-Provisioning Migration
-- ----------------------------------------------------------------------------
-- Purpose: guarantee that every user who picks a role automatically gets the
-- matching `creators` / `brands` row that the whole app depends on
-- (posting projects/campaigns, appearing in Search, showing creations).
--
-- Safe to run multiple times (idempotent). Run in the Supabase SQL Editor.
-- This migration does NOT recreate the core tables (they already exist) and
-- does NOT alter projects/campaigns.
--
-- NOTE: `projects.target_aud/genre/platforms` and the campaign equivalents are
-- `text` columns that store JSON-encoded strings (e.g. '["RPG","Action"]').
-- That is intentional and unchanged here; the app parses them with safeJsonParse.
-- ============================================================================


-- ─── 1. Integrity fix on creators / brands ─────────────────────────────────
-- Both tables ship with `user_id uuid DEFAULT gen_random_uuid()` and no UNIQUE
-- constraint. That default is a footgun: any insert that forgets user_id gets a
-- random orphan id. We drop the default, require user_id, and enforce one row
-- per user so provisioning is exactly-once.

-- Remove any orphan rows created by the bad default (user_id not pointing at a
-- real user). Harmless on empty tables.
DELETE FROM public.creators c
  WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = c.user_id);
DELETE FROM public.brands b
  WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = b.user_id);

-- Collapse accidental duplicates (keep the earliest row per user).
DELETE FROM public.creators a
  USING public.creators b
  WHERE a.user_id = b.user_id AND a.id > b.id;
DELETE FROM public.brands a
  USING public.brands b
  WHERE a.user_id = b.user_id AND a.id > b.id;

ALTER TABLE public.creators ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE public.brands   ALTER COLUMN user_id DROP DEFAULT;

ALTER TABLE public.creators ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.brands   ALTER COLUMN user_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'creators_user_id_key'
  ) THEN
    ALTER TABLE public.creators ADD CONSTRAINT creators_user_id_key UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brands_user_id_key'
  ) THEN
    ALTER TABLE public.brands ADD CONSTRAINT brands_user_id_key UNIQUE (user_id);
  END IF;
END $$;


-- ─── 2. Trigger: create public.users row on auth signup ────────────────────
-- Covers both email/password (role arrives in raw_user_meta_data.role from
-- supabase.auth.signUp options.data) and OAuth (role filled in later at
-- onboarding). Guarded so it coexists with any handle_new_user already present.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    INSERT INTO public.users (id, email, display_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'role'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── 3. Trigger: provision creators/brands row when role is set ────────────
-- Fires when a users row is inserted with a role, or its role is updated.
-- DECISION: agency & production are treated as brands for now (they run
-- campaigns / seek creators). Adjust the mapping below if that changes.

CREATE OR REPLACE FUNCTION public.handle_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.role = 'creator' THEN
    IF NOT EXISTS (SELECT 1 FROM public.creators WHERE user_id = NEW.id) THEN
      INSERT INTO public.creators (user_id) VALUES (NEW.id);
    END IF;
  ELSIF NEW.role IN ('brand', 'agency', 'production') THEN
    IF NOT EXISTS (SELECT 1 FROM public.brands WHERE user_id = NEW.id) THEN
      INSERT INTO public.brands (user_id) VALUES (NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_role_set ON public.users;
CREATE TRIGGER on_user_role_set
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_role();


-- ─── 4. Backfill existing users ────────────────────────────────────────────
-- Provision rows for any users who already picked a role before this migration.
INSERT INTO public.creators (user_id)
  SELECT u.id FROM public.users u
  WHERE u.role = 'creator'
    AND NOT EXISTS (SELECT 1 FROM public.creators c WHERE c.user_id = u.id);

INSERT INTO public.brands (user_id)
  SELECT u.id FROM public.users u
  WHERE u.role IN ('brand', 'agency', 'production')
    AND NOT EXISTS (SELECT 1 FROM public.brands b WHERE b.user_id = u.id);


-- ─── 5. RLS: ensure public read for discovery (non-destructive) ────────────
-- Search and the feed use the anon key to read these tables. If RLS is enabled
-- on a table without a SELECT policy, reads silently return nothing. We add a
-- permissive read policy only when one is missing. We do NOT change writes.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','creators','brands','projects','campaigns'] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relrowsecurity = true
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND cmd = 'SELECT'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "Public read %1$s" ON public.%1$I FOR SELECT USING (true)', t
      );
    END IF;
  END LOOP;
END $$;

-- Done.
