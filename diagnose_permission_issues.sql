-- Script para diagnosticar problemas de permissão no sistema
-- EXECUTE NO SUPABASE SQL EDITOR

-- 1. Verificar usuário atual e suas permissões
SELECT 
    'USUÁRIO ATUAL' as status,
    auth.uid() as current_user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as current_user_email;

-- 2. Verificar perfil do usuário atual
SELECT 
    'PERFIL DO USUÁRIO ATUAL' as status,
    p.*
FROM public.profiles p
WHERE p.id = auth.uid();

-- 3. Verificar roles do usuário atual
SELECT 
    'ROLES DO USUÁRIO ATUAL' as status,
    ur.*
FROM public.user_roles ur
WHERE ur.user_id = auth.uid();

-- 4. Testar funções de permissão
SELECT 
    'TESTE DE FUNÇÕES DE PERMISSÃO' as status,
    public.has_role(auth.uid(), 'super_admin'::app_role) as has_super_admin,
    public.has_role(auth.uid(), 'admin'::app_role) as has_admin,
    public.has_role(auth.uid(), 'user'::app_role) as has_user,
    public.is_admin() as is_admin_function,
    public.is_super_admin() as is_super_admin_function,
    public.get_user_role() as get_user_role_result;

-- 5. Verificar políticas RLS nas tabelas principais
SELECT 
    'POLÍTICAS RLS - PROFILES' as status,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles';

SELECT 
    'POLÍTICAS RLS - USER_ROLES' as status,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'user_roles';

SELECT 
    'POLÍTICAS RLS - SCREENS' as status,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'screens';

SELECT 
    'POLÍTICAS RLS - CAMPAIGNS' as status,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'campaigns';

-- 6. Verificar se RLS está habilitado nas tabelas
SELECT 
    'STATUS RLS DAS TABELAS' as status,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles', 'screens', 'campaigns', 'venues')
ORDER BY tablename;

-- 7. Testar acesso direto às tabelas
SELECT 
    'TESTE ACESSO - PROFILES' as status,
    COUNT(*) as total_profiles
FROM public.profiles;

SELECT 
    'TESTE ACESSO - USER_ROLES' as status,
    COUNT(*) as total_roles
FROM public.user_roles;

SELECT 
    'TESTE ACESSO - SCREENS' as status,
    COUNT(*) as total_screens
FROM public.screens;

SELECT 
    'TESTE ACESSO - CAMPAIGNS' as status,
    COUNT(*) as total_campaigns
FROM public.campaigns;

-- 8. Verificar se há usuários no sistema
SELECT 
    'USUÁRIOS NO SISTEMA' as status,
    au.email,
    p.full_name,
    p.role as profile_role,
    p.super_admin,
    ur.role as user_role
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
ORDER BY au.created_at;

-- 9. Verificar dados específicos do hildebrando
SELECT 
    'DADOS HILDEBRANDO' as status,
    au.email,
    au.id,
    p.full_name,
    p.role as profile_role,
    p.super_admin,
    ur.role as user_role,
    public.get_user_role(au.id) as function_result
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

SELECT 'DIAGNÓSTICO COMPLETO FINALIZADO!' as resultado;
