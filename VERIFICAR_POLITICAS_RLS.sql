-- ============================================
-- VERIFICAR POLÍTICAS RLS - Execute no SQL Editor
-- ============================================

-- Verificar políticas em profiles
SELECT 'Políticas em profiles:' as info;
SELECT 
    policyname, 
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;

-- Verificar políticas em user_roles
SELECT 'Políticas em user_roles:' as info;
SELECT 
    policyname, 
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_roles' 
ORDER BY policyname;

-- Verificar se as políticas corretas existem
SELECT 'Verificação das políticas corretas:' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'profiles' 
            AND policyname = 'profiles_insert_anon_and_auth'
            AND 'anon' = ANY(roles)
            AND 'authenticated' = ANY(roles)
        ) THEN '✅ Política profiles OK'
        ELSE '❌ Política profiles FALTANDO'
    END as profiles_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'user_roles' 
            AND policyname = 'user_roles_insert_anon_and_auth'
            AND 'anon' = ANY(roles)
            AND 'authenticated' = ANY(roles)
        ) THEN '✅ Política user_roles OK'
        ELSE '❌ Política user_roles FALTANDO'
    END as user_roles_status;

-- Verificar trigger handle_new_user
SELECT 'Verificação do trigger:' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created'
        ) THEN '✅ Trigger on_auth_user_created existe'
        ELSE '❌ Trigger on_auth_user_created FALTANDO'
    END as trigger_status;

-- Verificar função handle_new_user
SELECT 'Verificação da função:' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'handle_new_user'
        ) THEN '✅ Função handle_new_user existe'
        ELSE '❌ Função handle_new_user FALTANDO'
    END as function_status;
