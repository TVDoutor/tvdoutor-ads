-- Script para corrigir a exibição do super admin
-- Execute no Supabase SQL Editor

-- 1. Verificar estado atual do usuário Hildebrando
SELECT 
    'Estado atual do Hildebrando' as status,
    id,
    email,
    full_name,
    display_name,
    role,
    super_admin,
    created_at,
    updated_at
FROM public.profiles 
WHERE email = 'hildebrando.cardoso@tvdoutor.com.br' 
   OR id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 2. Verificar roles na tabela user_roles
SELECT 
    'Roles na tabela user_roles' as status,
    ur.user_id,
    ur.role,
    p.email,
    p.full_name
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.user_id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3'
   OR p.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 3. Garantir que o campo super_admin está definido corretamente
UPDATE public.profiles 
SET 
    super_admin = true,
    role = 'admin',
    updated_at = now()
WHERE email = 'hildebrando.cardoso@tvdoutor.com.br' 
   OR id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 4. Garantir que há um role super_admin na tabela user_roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3',
    'super_admin',
    now()
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3' 
    AND role = 'super_admin'
);

-- 5. Remover roles duplicados (manter apenas super_admin)
DELETE FROM public.user_roles 
WHERE user_id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3' 
AND role != 'super_admin';

-- 6. Verificar resultado final
SELECT 
    'Resultado final - Perfil' as status,
    id,
    email,
    full_name,
    display_name,
    role,
    super_admin,
    updated_at
FROM public.profiles 
WHERE email = 'hildebrando.cardoso@tvdoutor.com.br' 
   OR id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

SELECT 
    'Resultado final - Roles' as status,
    ur.user_id,
    ur.role,
    ur.created_at,
    p.email,
    p.full_name
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.user_id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 7. Verificar como será exibido no frontend
SELECT 
    'Como será exibido no frontend' as status,
    p.email,
    p.full_name,
    p.display_name,
    p.super_admin,
    ur.role as user_role,
    CASE 
        WHEN p.super_admin = true THEN 'Super Admin'
        WHEN ur.role = 'super_admin' THEN 'Super Admin'
        WHEN ur.role = 'admin' THEN 'Admin'
        ELSE 'Usuário'
    END as frontend_display
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br' 
   OR p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

SELECT 'Correção aplicada com sucesso!' as final_status;
