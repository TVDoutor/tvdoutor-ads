-- ============================================
-- REABILITAR RLS COM POLÍTICAS CORRETAS - Execute após teste
-- ============================================

-- 1. Reabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas existentes
DROP POLICY IF EXISTS "profiles_insert_allow_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_allow_all" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_insert_allow_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_allow_all" ON public.user_roles;

-- 3. Criar políticas corretas e permissivas
CREATE POLICY "profiles_allow_all_operations"
ON public.profiles
FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "user_roles_allow_all_operations"
ON public.user_roles
FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 4. Verificar se tudo está correto
SELECT 'Políticas finais:' as info;
SELECT 
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'user_roles')
ORDER BY tablename, policyname;

SELECT '✅ RLS reabilitado com políticas permissivas!' as status;
