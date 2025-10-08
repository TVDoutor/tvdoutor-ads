-- ============================================
-- CORREÇÃO DEFINITIVA RLS - Execute no SQL Editor
-- ============================================

-- 1. PRIMEIRO: Verificar políticas atuais
SELECT 'Políticas atuais em profiles:' as info;
SELECT policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;

SELECT 'Políticas atuais em user_roles:' as info;
SELECT policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'user_roles' 
ORDER BY policyname;

-- 2. REMOVER TODAS as políticas de INSERT existentes
DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_trigger" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_anon_and_auth" ON public.profiles;

DROP POLICY IF EXISTS "user_roles_insert_service" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_trigger" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_anon_and_auth" ON public.user_roles;

-- 3. CRIAR políticas permissivas para INSERT
CREATE POLICY "profiles_insert_allow_all"
ON public.profiles
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY "user_roles_insert_allow_all"
ON public.user_roles
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

-- 4. CRIAR políticas para SELECT (necessário para verificação)
CREATE POLICY "profiles_select_allow_all"
ON public.profiles
FOR SELECT
TO anon, authenticated, service_role
USING (true);

CREATE POLICY "user_roles_select_allow_all"
ON public.user_roles
FOR SELECT
TO anon, authenticated, service_role
USING (true);

-- 5. Verificar se as políticas foram criadas
SELECT 'Políticas criadas em profiles:' as info;
SELECT policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;

SELECT 'Políticas criadas em user_roles:' as info;
SELECT policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'user_roles' 
ORDER BY policyname;

-- 6. Verificar se RLS está habilitado
SELECT 'Status RLS:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'user_roles');

-- 7. Confirmar aplicação
SELECT '✅ Correção RLS aplicada! Agora teste o signup novamente.' as status;
