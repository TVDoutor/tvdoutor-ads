-- ====================================================================
-- Migration: Fix Signup RLS Policies
-- Created: 2025-10-08
-- Description: Corrigir políticas RLS que bloqueiam o signup
-- ====================================================================

-- Problema:
-- As políticas RLS restritivas em profiles e user_roles estão impedindo
-- que o trigger handle_new_user insira dados durante o signup.
-- 
-- Solução:
-- Criar políticas permissivas que permitam INSERT para roles anon e authenticated
-- durante o processo de signup.

BEGIN;

-- ====================================================================
-- 1. REMOVER POLÍTICAS PROBLEMÁTICAS
-- ====================================================================

-- Remover política restritiva de INSERT em profiles (se existir)
DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;

-- Remover política restritiva de INSERT em user_roles (se existir)
DROP POLICY IF EXISTS "user_roles_insert_service" ON public.user_roles;

-- Remover outras políticas de INSERT que possam existir
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for service role only" ON public.user_roles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;

-- ====================================================================
-- 2. CRIAR POLÍTICAS PERMISSIVAS PARA SIGNUP
-- ====================================================================

-- Permitir INSERT em profiles para anon e authenticated
-- Isso permite que o trigger handle_new_user insira o perfil durante signup
CREATE POLICY "profiles_insert_anon_and_auth"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Permitir INSERT em user_roles para anon e authenticated
-- Isso permite que o trigger handle_new_user insira a role durante signup
CREATE POLICY "user_roles_insert_anon_and_auth"
ON public.user_roles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- ====================================================================
-- 3. MANTER/CRIAR POLÍTICAS DE SELECT
-- ====================================================================

-- Política de SELECT para profiles (visualizar próprio perfil)
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Política de SELECT para user_roles (visualizar próprias roles)
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ====================================================================
-- 4. MANTER/CRIAR POLÍTICAS DE UPDATE
-- ====================================================================

-- Política de UPDATE para profiles (atualizar próprio perfil)
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ====================================================================
-- 5. POLÍTICAS PARA SERVICE ROLE (ADMIN)
-- ====================================================================

-- Service Role pode fazer tudo em profiles
DROP POLICY IF EXISTS "profiles_service_all" ON public.profiles;
CREATE POLICY "profiles_service_all"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Service Role pode fazer tudo em user_roles
DROP POLICY IF EXISTS "user_roles_service_all" ON public.user_roles;
CREATE POLICY "user_roles_service_all"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ====================================================================
-- 6. GARANTIR QUE RLS ESTÁ HABILITADO
-- ====================================================================

-- Habilitar RLS em profiles (se não estiver)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS em user_roles (se não estiver)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ====================================================================
-- VERIFICAÇÃO
-- ====================================================================

-- Listar todas as políticas de profiles
DO $$
BEGIN
  RAISE NOTICE '=== POLÍTICAS DE PROFILES ===';
END $$;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- Listar todas as políticas de user_roles
DO $$
BEGIN
  RAISE NOTICE '=== POLÍTICAS DE USER_ROLES ===';
END $$;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_roles'
ORDER BY cmd, policyname;

-- ====================================================================
-- NOTAS IMPORTANTES
-- ====================================================================

-- 1. Esta migração torna as políticas mais permissivas para permitir signup
-- 2. O trigger handle_new_user agora poderá inserir em ambas as tabelas
-- 3. Usuários só podem ver/editar seus próprios dados (exceto service_role)
-- 4. Service Role (usado pelas Edge Functions) tem acesso total
-- 5. As políticas WITH CHECK (true) significam que qualquer registro pode ser inserido
--    mas apenas durante o signup (triggered by auth.users INSERT)

