-- ============================================
-- VERIFICAR STATUS DO HILDEBRANDO
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Verificar perfil na tabela profiles
SELECT '👤 PERFIL NA TABELA PROFILES:' as info;
SELECT 
    id,
    email,
    full_name,
    role,
    super_admin,
    created_at,
    updated_at
FROM public.profiles 
WHERE email = 'hildebrando.cardoso@tvdoutor.com.br'
   OR id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 2. Verificar roles na tabela user_roles
SELECT '🔑 ROLES NA TABELA USER_ROLES:' as info;
SELECT 
    ur.user_id,
    ur.role,
    ur.created_at,
    p.email,
    p.full_name
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br'
   OR p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 3. Verificar todas as políticas RLS
SELECT '🛡️ POLÍTICAS RLS ATIVAS:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'user_roles')
ORDER BY tablename, policyname;

-- 4. Verificar se RLS está ativo
SELECT '⚙️ STATUS RLS:' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '🔴 RLS ATIVO'
        ELSE '✅ RLS DESABILITADO'
    END as status
FROM pg_tables 
WHERE tablename IN ('profiles', 'user_roles')
ORDER BY tablename;
