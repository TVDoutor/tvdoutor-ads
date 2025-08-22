-- Script para testar se o super admin está configurado corretamente
-- Execute no Supabase SQL Editor

-- 1. Verificar perfil atual do usuário
SELECT 
    'Perfil atual do usuário' as status,
    id,
    email,
    full_name,
    display_name,
    role,
    super_admin,
    created_at,
    updated_at
FROM public.profiles 
WHERE id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 2. Verificar roles na tabela user_roles
SELECT 
    'Roles do usuário' as status,
    user_id,
    role,
    created_at
FROM public.user_roles 
WHERE user_id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 3. Testar função get_user_role
SELECT 
    'Função get_user_role' as status,
    public.get_user_role('7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3') as role_result;

-- 4. Verificar se o usuário aparece como super admin
SELECT 
    'Verificação completa' as status,
    p.email,
    p.full_name,
    p.display_name,
    p.role as profile_role,
    p.super_admin,
    ur.role as user_role,
    CASE 
        WHEN p.super_admin = true THEN 'Super Admin'
        WHEN ur.role = 'super_admin' THEN 'Super Admin'
        WHEN ur.role = 'admin' THEN 'Admin'
        ELSE 'User'
    END as frontend_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

SELECT 'Teste concluído!' as final_status;
