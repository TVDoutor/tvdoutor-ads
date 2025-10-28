-- Script para verificar se usuários têm role 'manager' corretamente atribuída
-- Execute este script no Supabase SQL Editor para diagnosticar o problema

-- 1. Verificar se o enum app_role contém 'manager'
SELECT 
    enumlabel as role_value,
    enumsortorder as sort_order
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'app_role'
)
ORDER BY enumsortorder;

-- 2. Verificar usuários com role 'manager' na tabela user_roles
SELECT 
    ur.user_id,
    ur.role,
    ur.created_at,
    p.email,
    p.full_name,
    p.role as profile_role,
    p.super_admin
FROM public.user_roles ur
LEFT JOIN public.profiles p ON ur.user_id = p.id
WHERE ur.role = 'manager'
ORDER BY ur.created_at DESC;

-- 3. Verificar todos os usuários e suas roles
SELECT 
    ur.user_id,
    ur.role as user_role,
    ur.created_at,
    p.email,
    p.full_name,
    p.role as profile_role,
    p.super_admin
FROM public.user_roles ur
LEFT JOIN public.profiles p ON ur.user_id = p.id
ORDER BY ur.created_at DESC;

-- 4. Verificar se há inconsistências entre profiles.role e user_roles.role
SELECT 
    p.id,
    p.email,
    p.role as profile_role,
    ur.role as user_role,
    CASE 
        WHEN p.role = ur.role::text THEN 'Consistente'
        ELSE 'Inconsistente'
    END as status
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.role IS NOT NULL
ORDER BY status DESC, p.email;

-- 5. Contar usuários por role
SELECT 
    role,
    COUNT(*) as total_users
FROM public.user_roles
GROUP BY role
ORDER BY total_users DESC;
