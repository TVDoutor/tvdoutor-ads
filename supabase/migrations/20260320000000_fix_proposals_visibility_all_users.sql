-- =============================================================================
-- FIX: Proposals visibility - any authenticated user can view all proposals
-- Date: 2026-03-20
-- Problem: Proposals are restricted to owner or admin. Users cannot see
--          proposals created by others. This migration ensures all authenticated
--          users can SELECT all proposals.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. proposals - Drop ALL SELECT policies and recreate permissive one
-- =============================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
    -- Drop every policy that could restrict SELECT
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE tablename = 'proposals' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.proposals', pol.policyname);
    END LOOP;

    -- Recreate permissive policies
    CREATE POLICY "proposals_select_all_auth"
      ON public.proposals FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "proposals_insert_all_auth"
      ON public.proposals FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "proposals_update_owner_or_manager"
      ON public.proposals FOR UPDATE TO authenticated
      USING (created_by = auth.uid() OR created_by IS NULL OR public.is_manager_or_above())
      WITH CHECK (created_by = auth.uid() OR created_by IS NULL OR public.is_manager_or_above());

    DROP POLICY IF EXISTS "proposals_delete_manager" ON public.proposals;
    DROP POLICY IF EXISTS "proposals_delete_admin" ON public.proposals;
    DROP POLICY IF EXISTS "Only admins can delete proposals" ON public.proposals;
    CREATE POLICY "proposals_delete_manager"
      ON public.proposals FOR DELETE TO authenticated
      USING (public.is_manager_or_above());

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
  END IF;
END $$;

-- =============================================================================
-- 2. proposal_screens - All authenticated can read (follows parent visibility)
-- =============================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposal_screens' AND table_schema = 'public') THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE tablename = 'proposal_screens' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.proposal_screens', pol.policyname);
    END LOOP;

    CREATE POLICY "proposal_screens_select_all"
      ON public.proposal_screens FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "proposal_screens_insert_auth"
      ON public.proposal_screens FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "proposal_screens_update_auth"
      ON public.proposal_screens FOR UPDATE TO authenticated
      USING (true) WITH CHECK (true);

    CREATE POLICY "proposal_screens_delete_auth"
      ON public.proposal_screens FOR DELETE TO authenticated
      USING (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_screens TO authenticated;
  END IF;
END $$;

COMMIT;
