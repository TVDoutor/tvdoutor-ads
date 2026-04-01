-- =============================================================================
-- FIX: Manager role cannot INSERT into agencia_projetos and related tables
-- Date: 2026-03-19
-- Problem: Data created by users with role "Manager" is not being saved.
--          Only Admin users can save. This migration ensures Manager has
--          full INSERT/SELECT/UPDATE/DELETE on projects, agencies, deals.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Ensure is_admin() and is_manager_or_above() use role::text for compatibility
--    (user_roles.role can be enum or text depending on migration history)
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
    AND role::text IN ('admin', 'super_admin', 'manager')
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND (super_admin = true OR (role IS NOT NULL AND role::text IN ('admin', 'super_admin', 'manager')))
  );
$$;

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
    AND role::text IN ('admin', 'super_admin', 'manager')
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND (super_admin = true OR (role IS NOT NULL AND role::text IN ('admin', 'super_admin', 'manager')))
  );
$$;

-- =============================================================================
-- 2. agencia_projetos - Drop ALL possible INSERT policies and recreate
--    Ensure NO policy can block Manager from inserting
-- =============================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projetos' AND table_schema = 'public') THEN
    -- Drop every policy that could restrict INSERT
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE tablename = 'agencia_projetos' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.agencia_projetos', pol.policyname);
    END LOOP;

    -- Recreate only permissive policies
    CREATE POLICY "agencia_projetos_select_all"
      ON public.agencia_projetos FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "agencia_projetos_insert_all"
      ON public.agencia_projetos FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "agencia_projetos_update_all"
      ON public.agencia_projetos FOR UPDATE TO authenticated
      USING (true) WITH CHECK (true);

    CREATE POLICY "agencia_projetos_delete_all"
      ON public.agencia_projetos FOR DELETE TO authenticated
      USING (true);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencia_projetos TO authenticated;
  END IF;
END $$;

-- =============================================================================
-- 3. agencias - Ensure Manager can INSERT
-- =============================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencias' AND table_schema = 'public') THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE tablename = 'agencias' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.agencias', pol.policyname);
    END LOOP;

    CREATE POLICY "agencias_select_all"
      ON public.agencias FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "agencias_insert_all"
      ON public.agencias FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "agencias_update_manager"
      ON public.agencias FOR UPDATE TO authenticated
      USING (public.is_manager_or_above())
      WITH CHECK (public.is_manager_or_above());

    CREATE POLICY "agencias_delete_manager"
      ON public.agencias FOR DELETE TO authenticated
      USING (public.is_manager_or_above());

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencias TO authenticated;
  END IF;
END $$;

-- =============================================================================
-- 4. agencia_deals - Ensure Manager can INSERT
-- =============================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_deals' AND table_schema = 'public') THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE tablename = 'agencia_deals' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.agencia_deals', pol.policyname);
    END LOOP;

    CREATE POLICY "agencia_deals_select_all"
      ON public.agencia_deals FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "agencia_deals_insert_all"
      ON public.agencia_deals FOR INSERT TO authenticated
      WITH CHECK (true);

    CREATE POLICY "agencia_deals_update_manager"
      ON public.agencia_deals FOR UPDATE TO authenticated
      USING (public.is_manager_or_above())
      WITH CHECK (public.is_manager_or_above());

    CREATE POLICY "agencia_deals_delete_manager"
      ON public.agencia_deals FOR DELETE TO authenticated
      USING (public.is_manager_or_above());

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencia_deals TO authenticated;
  END IF;
END $$;

-- =============================================================================
-- 5. agencia_contatos - Allow Manager to INSERT (was is_admin() only)
-- =============================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_contatos' AND table_schema = 'public') THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE tablename = 'agencia_contatos' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.agencia_contatos', pol.policyname);
    END LOOP;

    CREATE POLICY "agencia_contatos_select_all"
      ON public.agencia_contatos FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "agencia_contatos_insert_manager"
      ON public.agencia_contatos FOR INSERT TO authenticated
      WITH CHECK (public.is_manager_or_above());

    CREATE POLICY "agencia_contatos_update_manager"
      ON public.agencia_contatos FOR UPDATE TO authenticated
      USING (public.is_manager_or_above())
      WITH CHECK (public.is_manager_or_above());

    CREATE POLICY "agencia_contatos_delete_manager"
      ON public.agencia_contatos FOR DELETE TO authenticated
      USING (public.is_manager_or_above());

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencia_contatos TO authenticated;
  END IF;
END $$;

-- =============================================================================
-- 6. pessoas_projeto - Allow Manager to SELECT/INSERT (was is_admin() only)
--    Managers need to see people to assign as project responsibles
-- =============================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pessoas_projeto' AND table_schema = 'public') THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE tablename = 'pessoas_projeto' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.pessoas_projeto', pol.policyname);
    END LOOP;

    CREATE POLICY "pessoas_projeto_select_all"
      ON public.pessoas_projeto FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY "pessoas_projeto_insert_manager"
      ON public.pessoas_projeto FOR INSERT TO authenticated
      WITH CHECK (public.is_manager_or_above());

    CREATE POLICY "pessoas_projeto_update_manager"
      ON public.pessoas_projeto FOR UPDATE TO authenticated
      USING (public.is_manager_or_above())
      WITH CHECK (public.is_manager_or_above());

    CREATE POLICY "pessoas_projeto_delete_manager"
      ON public.pessoas_projeto FOR DELETE TO authenticated
      USING (public.is_manager_or_above());

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.pessoas_projeto TO authenticated;
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- DIAGNÓSTICO: Execute estas queries para verificar se Managers podem inserir
-- =============================================================================
-- 1. Listar políticas atuais em agencia_projetos:
--    SELECT policyname, cmd, qual, with_check
--    FROM pg_policies WHERE tablename = 'agencia_projetos';
--
-- 2. Verificar roles dos usuários (Maria Laura, Hildebrando, etc):
--    SELECT p.email, p.full_name, ur.role
--    FROM auth.users u
--    JOIN public.profiles p ON p.id = u.id
--    LEFT JOIN public.user_roles ur ON ur.user_id = u.id
--    WHERE u.email ILIKE '%maria%' OR u.email ILIKE '%hildebrando%' OR u.email ILIKE '%publicidade%';
-- =============================================================================
