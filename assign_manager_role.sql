-- Script para atribuir role 'manager' a um usuário específico
-- Substitua 'EMAIL_DO_USUARIO' pelo email do usuário que você quer testar

-- 1. Verificar se o usuário existe
SELECT 
    id,
    email,
    full_name,
    role as profile_role,
    super_admin
FROM public.profiles 
WHERE email = 'EMAIL_DO_USUARIO';

-- 2. Verificar se já tem role na tabela user_roles
SELECT 
    ur.user_id,
    ur.role,
    ur.created_at,
    p.email
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.id
WHERE p.email = 'EMAIL_DO_USUARIO';

-- 3. Atribuir role 'manager' ao usuário (substitua o UUID pelo ID do usuário)
-- IMPORTANTE: Execute apenas se o usuário não tiver role 'manager' ainda
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    id,
    'manager'::app_role,
    now()
FROM public.profiles 
WHERE email = 'EMAIL_DO_USUARIO'
AND id NOT IN (
    SELECT user_id 
    FROM public.user_roles 
    WHERE role = 'manager'
);

-- 4. Verificar se a atribuição foi bem-sucedida
SELECT 
    ur.user_id,
    ur.role,
    ur.created_at,
    p.email,
    p.full_name
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.id
WHERE p.email = 'EMAIL_DO_USUARIO';

-- 5. Atualizar também o campo role na tabela profiles (opcional)
UPDATE public.profiles 
SET role = 'manager'
WHERE email = 'EMAIL_DO_USUARIO'
AND role != 'manager';

-- 6. Verificar o resultado final
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role as profile_role,
    ur.role as user_role,
    p.super_admin
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.email = 'EMAIL_DO_USUARIO';
