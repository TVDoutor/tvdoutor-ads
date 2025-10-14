-- VERIFICAR STATUS DOS USUÁRIOS MANAGERS
-- Verificar roles dos usuários publicidade5, publicidade6 e suporte

-- 1. Ver informações dos usuários na tabela profiles
SELECT 
    'PROFILES TABLE' as source,
    id,
    email,
    full_name,
    role as profile_role,
    super_admin,
    created_at
FROM public.profiles
WHERE email IN (
    'publicidade5@tvdoutor.com.br',
    'publicidade6@tvdoutor.com.br',
    'suporte@tvdoutor.com.br'
)
ORDER BY email;

-- 2. Ver roles na tabela user_roles
SELECT 
    'USER_ROLES TABLE' as source,
    ur.user_id,
    p.email,
    ur.role,
    ur.created_at
FROM public.user_roles ur
INNER JOIN public.profiles p ON ur.user_id = p.id
WHERE p.email IN (
    'publicidade5@tvdoutor.com.br',
    'publicidade6@tvdoutor.com.br',
    'suporte@tvdoutor.com.br'
)
ORDER BY p.email, ur.role;

-- 3. Ver auth.users para verificar se existem
SELECT 
    'AUTH.USERS TABLE' as source,
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE email IN (
    'publicidade5@tvdoutor.com.br',
    'publicidade6@tvdoutor.com.br',
    'suporte@tvdoutor.com.br'
)
ORDER BY email;

-- 4. Verificar se o enum app_role tem 'manager'
SELECT 
    'ENUM VALUES' as info,
    enumlabel as role_value
FROM pg_enum
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'app_role'
)
ORDER BY enumlabel;

-- 5. Verificar o que a função is_manager retorna para esses usuários
-- (precisa executar como cada usuário)

