-- Script para corrigir permissões do usuário hildebrando.cardoso@tvdoutor.com.br
-- Execute no Supabase SQL Editor

-- 1. Encontrar o usuário pelo email
SELECT 
    'Procurando usuário por email' as status,
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 2. Verificar perfil atual
SELECT 
    'Verificando perfil atual' as status,
    p.id,
    p.email,
    p.full_name,
    p.display_name,
    p.role,
    p.super_admin
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 3. Verificar roles atuais na tabela user_roles
SELECT 
    'Verificando roles atuais' as status,
    ur.user_id,
    ur.role,
    ur.created_at,
    au.email
FROM public.user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 4. Adicionar coluna super_admin se não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS super_admin boolean DEFAULT false;

-- 5. Atualizar/Criar perfil para o usuário
WITH user_info AS (
    SELECT id, email FROM auth.users WHERE email = 'hildebrando.cardoso@tvdoutor.com.br'
)
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    display_name,
    role,
    super_admin,
    created_at,
    updated_at
)
SELECT 
    ui.id,
    ui.email,
    'Hildebrando Cardoso',
    'Hildebrando Cardoso',
    'admin',
    true,
    now(),
    now()
FROM user_info ui
ON CONFLICT (id) DO UPDATE SET
    full_name = 'Hildebrando Cardoso',
    display_name = 'Hildebrando Cardoso',
    role = 'admin',
    super_admin = true,
    updated_at = now();

-- 6. Remover roles existentes para evitar duplicatas
DELETE FROM public.user_roles ur
USING auth.users au
WHERE ur.user_id = au.id 
AND au.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 7. Adicionar role de super_admin
WITH user_info AS (
    SELECT id FROM auth.users WHERE email = 'hildebrando.cardoso@tvdoutor.com.br'
)
INSERT INTO public.user_roles (
    user_id,
    role,
    created_at
)
SELECT 
    ui.id,
    'super_admin'::app_role,
    now()
FROM user_info ui;

-- 8. Verificação final - Perfil
SELECT 
    'Verificação final - Perfil' as status,
    p.id,
    p.email,
    p.full_name,
    p.display_name,
    p.role as profile_role,
    p.super_admin
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 9. Verificação final - Roles
SELECT 
    'Verificação final - Roles' as status,
    ur.user_id,
    ur.role,
    ur.created_at,
    au.email
FROM public.user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 10. Verificar todas as permissões
SELECT 
    'Verificação completa de permissões' as status,
    p.email,
    p.display_name,
    p.role as profile_role,
    p.super_admin,
    array_agg(ur.role) as user_roles
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
JOIN auth.users au ON au.id = p.id
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br'
GROUP BY p.id, p.email, p.display_name, p.role, p.super_admin;

-- 11. Mostrar todos os super admins para confirmação
SELECT 
    'Todos os super admins do sistema' as status,
    au.email,
    p.display_name,
    p.super_admin,
    ur.role,
    ur.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
JOIN auth.users au ON au.id = p.id
WHERE p.super_admin = true OR ur.role = 'super_admin'
ORDER BY p.created_at;

SELECT 'Permissões de super admin aplicadas com sucesso para hildebrando.cardoso@tvdoutor.com.br!' as resultado_final;

