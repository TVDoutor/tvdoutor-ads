-- =============================================================================
-- FIX: Cross-user visibility for projects, agencies, campaigns, and proposals
-- Date: 2026-03-18
-- Problem: Projects created by one user are not visible to other users.
--          Agencies should be visible to all users with manager role or above.
--          Proposals should be readable by all authenticated users.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. FIX is_admin() - Remove overly permissive temporary fallback
--    Properly checks for admin, super_admin, AND manager roles
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'manager')
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND (super_admin = true OR role IN ('admin', 'super_admin', 'manager'))
  );
$$;

-- =============================================================================
-- 2. is_manager_or_above() - Explicit check for manager, admin, super_admin
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'manager')
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND (super_admin = true OR role IN ('admin', 'super_admin', 'manager'))
  );
$$;

-- =============================================================================
-- 3. FIX agencia_projetos RLS - All authenticated users can read all projects
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projetos' AND table_schema = 'public') THEN
    ALTER TABLE public.agencia_projetos ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "agencia_projetos_select_auth" ON public.agencia_projetos;
    CREATE POLICY "agencia_projetos_select_auth"
      ON public.agencia_projetos FOR SELECT TO authenticated
      USING (true);

    DROP POLICY IF EXISTS "agencia_projetos_insert_auth" ON public.agencia_projetos;
    CREATE POLICY "agencia_projetos_insert_auth"
      ON public.agencia_projetos FOR INSERT TO authenticated
      WITH CHECK (true);

    DROP POLICY IF EXISTS "agencia_projetos_update_auth" ON public.agencia_projetos;
    CREATE POLICY "agencia_projetos_update_auth"
      ON public.agencia_projetos FOR UPDATE TO authenticated
      USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "agencia_projetos_update_admin" ON public.agencia_projetos;
    DROP POLICY IF EXISTS "agencia_projetos_delete_admin" ON public.agencia_projetos;

    DROP POLICY IF EXISTS "agencia_projetos_delete_auth" ON public.agencia_projetos;
    CREATE POLICY "agencia_projetos_delete_auth"
      ON public.agencia_projetos FOR DELETE TO authenticated
      USING (true);

    GRANT ALL ON public.agencia_projetos TO authenticated;
  END IF;
END $$;

-- =============================================================================
-- 4. FIX agencias RLS - All authenticated users can read all agencies
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencias' AND table_schema = 'public') THEN
    ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "agencias_select_auth" ON public.agencias;
    CREATE POLICY "agencias_select_auth"
      ON public.agencias FOR SELECT TO authenticated
      USING (true);

    DROP POLICY IF EXISTS "agencias_insert_auth" ON public.agencias;
    CREATE POLICY "agencias_insert_auth"
      ON public.agencias FOR INSERT TO authenticated
      WITH CHECK (true);

    DROP POLICY IF EXISTS "agencias_update_admin" ON public.agencias;
    CREATE POLICY "agencias_update_admin"
      ON public.agencias FOR UPDATE TO authenticated
      USING (public.is_manager_or_above())
      WITH CHECK (public.is_manager_or_above());

    DROP POLICY IF EXISTS "agencias_delete_admin" ON public.agencias;
    CREATE POLICY "agencias_delete_admin"
      ON public.agencias FOR DELETE TO authenticated
      USING (public.is_manager_or_above());

    GRANT ALL ON public.agencias TO authenticated;
  END IF;
END $$;

-- =============================================================================
-- 5. FIX agencia_deals RLS - All authenticated can read, manager+ can modify
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_deals' AND table_schema = 'public') THEN
    ALTER TABLE public.agencia_deals ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "agencia_deals_select_auth" ON public.agencia_deals;
    CREATE POLICY "agencia_deals_select_auth"
      ON public.agencia_deals FOR SELECT TO authenticated
      USING (true);

    DROP POLICY IF EXISTS "agencia_deals_insert_auth" ON public.agencia_deals;
    CREATE POLICY "agencia_deals_insert_auth"
      ON public.agencia_deals FOR INSERT TO authenticated
      WITH CHECK (true);

    DROP POLICY IF EXISTS "agencia_deals_update_admin" ON public.agencia_deals;
    CREATE POLICY "agencia_deals_update_admin"
      ON public.agencia_deals FOR UPDATE TO authenticated
      USING (public.is_manager_or_above())
      WITH CHECK (public.is_manager_or_above());

    DROP POLICY IF EXISTS "agencia_deals_delete_admin" ON public.agencia_deals;
    CREATE POLICY "agencia_deals_delete_admin"
      ON public.agencia_deals FOR DELETE TO authenticated
      USING (public.is_manager_or_above());

    GRANT ALL ON public.agencia_deals TO authenticated;
  END IF;
END $$;

-- =============================================================================
-- 6. FIX campaigns RLS - All authenticated can read all campaigns
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns' AND table_schema = 'public') THEN
    ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

    -- Drop old restrictive SELECT policies
    DROP POLICY IF EXISTS "Users can view own campaigns" ON public.campaigns;
    DROP POLICY IF EXISTS "Admins can view all campaigns" ON public.campaigns;

    -- All authenticated users can see all campaigns
    DROP POLICY IF EXISTS "campaigns_select_all_auth" ON public.campaigns;
    CREATE POLICY "campaigns_select_all_auth"
      ON public.campaigns FOR SELECT TO authenticated
      USING (true);

    -- All authenticated users can create campaigns
    DROP POLICY IF EXISTS "Users can create campaigns" ON public.campaigns;
    DROP POLICY IF EXISTS "Authenticated users can create campaigns" ON public.campaigns;
    DROP POLICY IF EXISTS "campaigns_insert_auth" ON public.campaigns;
    CREATE POLICY "campaigns_insert_auth"
      ON public.campaigns FOR INSERT TO authenticated
      WITH CHECK (true);

    -- Manager+ can update any campaign, others can update their own
    DROP POLICY IF EXISTS "Users can update own campaigns" ON public.campaigns;
    DROP POLICY IF EXISTS "Admins can update all campaigns" ON public.campaigns;
    DROP POLICY IF EXISTS "campaigns_update_auth" ON public.campaigns;
    CREATE POLICY "campaigns_update_auth"
      ON public.campaigns FOR UPDATE TO authenticated
      USING (created_by = auth.uid() OR public.is_manager_or_above())
      WITH CHECK (created_by = auth.uid() OR public.is_manager_or_above());

    -- Manager+ can delete any campaign, others can delete their own
    DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.campaigns;
    DROP POLICY IF EXISTS "Admins can delete all campaigns" ON public.campaigns;
    DROP POLICY IF EXISTS "campaigns_delete_auth" ON public.campaigns;
    CREATE POLICY "campaigns_delete_auth"
      ON public.campaigns FOR DELETE TO authenticated
      USING (created_by = auth.uid() OR public.is_manager_or_above());

    GRANT ALL ON public.campaigns TO authenticated;
  END IF;
END $$;

-- =============================================================================
-- 7. FIX proposals RLS - All authenticated can read, owner/manager+ can modify
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
    ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

    -- Drop all existing select policies to avoid conflicts
    DROP POLICY IF EXISTS "proposals_select_auth" ON public.proposals;
    DROP POLICY IF EXISTS "proposals_select_owner_or_admin" ON public.proposals;
    DROP POLICY IF EXISTS "select_proposals_owner_or_admin" ON public.proposals;

    -- All authenticated users can see all proposals
    DROP POLICY IF EXISTS "proposals_select_all_auth" ON public.proposals;
    CREATE POLICY "proposals_select_all_auth"
      ON public.proposals FOR SELECT TO authenticated
      USING (true);

    -- All authenticated users can create proposals
    DROP POLICY IF EXISTS "proposals_insert_auth" ON public.proposals;
    DROP POLICY IF EXISTS "proposals_insert_authenticated" ON public.proposals;
    DROP POLICY IF EXISTS "proposals_insert_all_auth" ON public.proposals;
    CREATE POLICY "proposals_insert_all_auth"
      ON public.proposals FOR INSERT TO authenticated
      WITH CHECK (true);

    -- Owner or manager+ can update proposals
    DROP POLICY IF EXISTS "proposals_update_owner_or_admin" ON public.proposals;
    DROP POLICY IF EXISTS "update_proposals_owner_or_admin" ON public.proposals;
    DROP POLICY IF EXISTS "proposals_update_owner_or_manager" ON public.proposals;
    CREATE POLICY "proposals_update_owner_or_manager"
      ON public.proposals FOR UPDATE TO authenticated
      USING (created_by = auth.uid() OR created_by IS NULL OR public.is_manager_or_above())
      WITH CHECK (created_by = auth.uid() OR created_by IS NULL OR public.is_manager_or_above());

    -- Manager+ can delete proposals
    DROP POLICY IF EXISTS "proposals_delete_admin" ON public.proposals;
    DROP POLICY IF EXISTS "Only admins can delete proposals" ON public.proposals;
    DROP POLICY IF EXISTS "proposals_delete_manager" ON public.proposals;
    CREATE POLICY "proposals_delete_manager"
      ON public.proposals FOR DELETE TO authenticated
      USING (public.is_manager_or_above());

    GRANT ALL ON public.proposals TO authenticated;
  END IF;
END $$;

-- =============================================================================
-- 8. FIX proposal_screens RLS - Follow parent proposal visibility
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposal_screens' AND table_schema = 'public') THEN
    ALTER TABLE public.proposal_screens ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "proposal_screens_select_proposal_owner" ON public.proposal_screens;
    DROP POLICY IF EXISTS "proposal_screens_insert_proposal_owner" ON public.proposal_screens;
    DROP POLICY IF EXISTS "proposal_screens_update_proposal_owner" ON public.proposal_screens;
    DROP POLICY IF EXISTS "proposal_screens_delete_proposal_owner" ON public.proposal_screens;
    DROP POLICY IF EXISTS "proposal_screens_select_auth" ON public.proposal_screens;
    DROP POLICY IF EXISTS "proposal_screens_insert_auth" ON public.proposal_screens;
    DROP POLICY IF EXISTS "proposal_screens_update_auth" ON public.proposal_screens;
    DROP POLICY IF EXISTS "proposal_screens_delete_auth" ON public.proposal_screens;

    CREATE POLICY "proposal_screens_select_auth"
      ON public.proposal_screens FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "proposal_screens_insert_auth"
      ON public.proposal_screens FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "proposal_screens_update_auth"
      ON public.proposal_screens FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.proposals p
          WHERE p.id = proposal_screens.proposal_id
          AND (p.created_by = auth.uid() OR p.created_by IS NULL OR public.is_manager_or_above())
        )
      );

    CREATE POLICY "proposal_screens_delete_auth"
      ON public.proposal_screens FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.proposals p
          WHERE p.id = proposal_screens.proposal_id
          AND (p.created_by = auth.uid() OR p.created_by IS NULL OR public.is_manager_or_above())
        )
      );

    GRANT ALL ON public.proposal_screens TO authenticated;
  END IF;
END $$;

-- =============================================================================
-- 9. FIX campaign_screens RLS - All authenticated can read
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_screens' AND table_schema = 'public') THEN
    ALTER TABLE public.campaign_screens ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own campaign screens" ON public.campaign_screens;
    DROP POLICY IF EXISTS "Admins can view all campaign screens" ON public.campaign_screens;
    DROP POLICY IF EXISTS "Users can create campaign screens" ON public.campaign_screens;
    DROP POLICY IF EXISTS "Users can update own campaign screens" ON public.campaign_screens;
    DROP POLICY IF EXISTS "Admins can update all campaign screens" ON public.campaign_screens;
    DROP POLICY IF EXISTS "Users can delete own campaign screens" ON public.campaign_screens;
    DROP POLICY IF EXISTS "Admins can delete all campaign screens" ON public.campaign_screens;
    DROP POLICY IF EXISTS "campaign_screens_select_auth" ON public.campaign_screens;
    DROP POLICY IF EXISTS "campaign_screens_insert_auth" ON public.campaign_screens;
    DROP POLICY IF EXISTS "campaign_screens_update_auth" ON public.campaign_screens;
    DROP POLICY IF EXISTS "campaign_screens_delete_auth" ON public.campaign_screens;

    CREATE POLICY "campaign_screens_select_auth"
      ON public.campaign_screens FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "campaign_screens_insert_auth"
      ON public.campaign_screens FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "campaign_screens_update_auth"
      ON public.campaign_screens FOR UPDATE TO authenticated
      USING (true) WITH CHECK (true);

    CREATE POLICY "campaign_screens_delete_auth"
      ON public.campaign_screens FOR DELETE TO authenticated
      USING (true);

    GRANT ALL ON public.campaign_screens TO authenticated;
  END IF;
END $$;

COMMIT;
