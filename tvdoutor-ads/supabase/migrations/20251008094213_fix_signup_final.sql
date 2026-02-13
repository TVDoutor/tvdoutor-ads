-- ============================================
-- FIX SIGNUP: Permitir anon inserir em profiles e user_roles
-- ============================================
-- Data: 2025-10-08
-- Descrição: Corrige políticas RLS para permitir que triggers executem
--            inserções durante o signup quando o usuário ainda é anon

-- 1. Remover políticas restritivas em profiles
DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_trigger" ON public.profiles;

-- 2. Criar política permissiva para anon + authenticated
CREATE POLICY "profiles_insert_anon_and_auth"
ON public.profiles
FOR INSERT
TO anon, authenticated  -- ✅ Permite anon E authenticated
WITH CHECK (true);

-- 3. Remover políticas restritivas em user_roles
DROP POLICY IF EXISTS "user_roles_insert_service" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_trigger" ON public.user_roles;

-- 4. Criar política permissiva para anon + authenticated
CREATE POLICY "user_roles_insert_anon_and_auth"
ON public.user_roles
FOR INSERT
TO anon, authenticated  -- ✅ Permite anon E authenticated
WITH CHECK (true);

-- 5. Comentários explicativos
COMMENT ON POLICY "profiles_insert_anon_and_auth" ON public.profiles IS 
  'Permite inserções por anon (durante signup via trigger) e authenticated';

COMMENT ON POLICY "user_roles_insert_anon_and_auth" ON public.user_roles IS 
  'Permite inserções por anon (durante signup via trigger) e authenticated';

-- 6. Verificar se as políticas foram criadas corretamente
DO $$
BEGIN
  RAISE NOTICE 'Migração aplicada com sucesso: fix_signup_final';
  RAISE NOTICE 'Políticas RLS atualizadas para permitir signup via trigger';
END $$;

