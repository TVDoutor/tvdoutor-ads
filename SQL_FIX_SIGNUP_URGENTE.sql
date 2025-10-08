-- ============================================
-- FIX SIGNUP URGENTE: Aplicar no Dashboard do Supabase
-- ============================================
-- Execute este SQL no Dashboard > SQL Editor > New Query

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

-- 5. Verificar se as políticas foram criadas
SELECT 'Políticas em profiles:' as info;
SELECT policyname, roles 
FROM pg_policies 
WHERE tablename = 'profiles' AND policyname LIKE '%insert%';

SELECT 'Políticas em user_roles:' as info;
SELECT policyname, roles 
FROM pg_policies 
WHERE tablename = 'user_roles' AND policyname LIKE '%insert%';

-- 6. Confirmar aplicação
SELECT '✅ Migração aplicada com sucesso! Agora teste o signup novamente.' as status;
