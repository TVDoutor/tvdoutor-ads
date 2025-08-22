-- Script para dar permissão de super admin para o usuário específico
-- Execute no Supabase SQL Editor

-- 1. Verificar se o usuário existe
SELECT 
    'Verificando usuário' as status,
    id,
    email,
    created_at
FROM auth.users 
WHERE id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 2. Verificar se já tem perfil
SELECT 
    'Verificando perfil existente' as status,
    id,
    email,
    full_name,
    display_name,
    role
FROM public.profiles 
WHERE id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 3. Verificar roles atuais
SELECT 
    'Verificando roles atuais' as status,
    user_id,
    role,
    created_at
FROM public.user_roles 
WHERE user_id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 4. Criar perfil se não existir e atualizar nome para 'Hildebrando Cardoso'
-- Adicionar campo super_admin se não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS super_admin boolean DEFAULT false;

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
    au.id,
    au.email,
    'Hildebrando Cardoso',
    'Hildebrando Cardoso',
    'admin',
    true,
    now(),
    now()
FROM auth.users au
WHERE au.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3'
ON CONFLICT (id) DO UPDATE SET
    full_name = 'Hildebrando Cardoso',
    display_name = 'Hildebrando Cardoso',
    role = 'admin',
    super_admin = true,
    updated_at = now();

-- 5. Remover roles existentes para evitar duplicatas
DELETE FROM public.user_roles 
WHERE user_id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 6. Adicionar role de super_admin
INSERT INTO public.user_roles (
    user_id,
    role,
    created_at
) VALUES (
    '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3',
    'super_admin',
    now()
);

-- 7. Verificar se foi aplicado corretamente
SELECT 
    'Verificação final - Perfil' as status,
    p.id,
    p.email,
    p.full_name,
    p.display_name,
    p.role as profile_role,
    p.super_admin
FROM public.profiles p
WHERE p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

SELECT 
    'Verificação final - Roles' as status,
    ur.user_id,
    ur.role,
    ur.created_at
FROM public.user_roles ur
WHERE ur.user_id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 8. Verificar se o usuário tem todas as permissões
SELECT 
    'Verificação de permissões' as status,
    p.email,
    p.display_name,
    p.role as profile_role,
    p.super_admin,
    array_agg(ur.role) as user_roles
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3'
GROUP BY p.id, p.email, p.display_name, p.role, p.super_admin;

-- 9. Testar função de verificação de admin
SELECT 
    'Teste de função is_super_admin' as status,
    public.is_super_admin() as is_super_admin_result;

-- 10. Mostrar todos os super admins do sistema
SELECT 
    'Todos os super admins' as status,
    p.email,
    p.display_name,
    p.super_admin,
    ur.role,
    ur.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.super_admin = true OR ur.role = 'super_admin'
ORDER BY p.created_at;

SELECT 'Super admin concedido com sucesso!' as final_status;
