-- ============================================
-- REABILITAR RLS COM POLÍTICAS CORRETAS
-- ============================================
-- Execute APENAS se o signup funcionou após desabilitar RLS

-- 1. Reabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Criar políticas permissivas
CREATE POLICY "profiles_allow_all"
ON public.profiles
FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "user_roles_allow_all"
ON public.user_roles
FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 3. Verificar
SELECT 'Políticas criadas:' as info;
SELECT 
    tablename,
    policyname,
    roles
FROM pg_policies 
WHERE tablename IN ('profiles', 'user_roles')
ORDER BY tablename;

SELECT '✅ RLS reabilitado com políticas permissivas!' as status;
