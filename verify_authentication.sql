-- Script para verificar a autenticação do usuário
-- Executar este script no banco de dados Supabase

-- 1. Verificar o usuário atual
SELECT 
    'USUÁRIO ATUAL' as status,
    auth.uid() as current_user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as current_user_email;

-- 2. Verificar se o usuário tem perfil
SELECT 
    'PERFIL DO USUÁRIO' as status,
    p.id,
    p.email,
    p.role,
    p.super_admin
FROM 
    public.profiles p
WHERE 
    p.id = auth.uid();

-- 3. Verificar papéis do usuário
SELECT 
    'PAPÉIS DO USUÁRIO' as status,
    ur.role,
    ur.created_at
FROM 
    public.user_roles ur
WHERE 
    ur.user_id = auth.uid();

-- 4. Verificar se o usuário é admin
SELECT 
    'VERIFICAÇÃO DE ADMIN' as status,
    public.is_admin() as is_admin;

-- 5. Verificar permissões de acesso às tabelas principais
SELECT 
    'PERMISSÕES DE ACESSO' as status,
    (SELECT COUNT(*) FROM public.profiles) > 0 as can_access_profiles,
    (SELECT COUNT(*) FROM public.user_roles) > 0 as can_access_user_roles,
    (SELECT COUNT(*) FROM public.screens) > 0 as can_access_screens,
    (SELECT COUNT(*) FROM public.campaigns) > 0 as can_access_campaigns,
    (SELECT COUNT(*) FROM public.venues) > 0 as can_access_venues;