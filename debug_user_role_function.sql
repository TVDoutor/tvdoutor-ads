-- Script para debugar a função get_user_role e corrigir permissões
-- EXECUTE NO SUPABASE SQL EDITOR

-- 1. Verificar se a função get_user_role existe
SELECT 
    'Verificando função get_user_role' as status,
    proname as function_name,
    pronargs as num_args,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'get_user_role';

-- 2. Verificar usuário hildebrando
SELECT 
    'Dados do usuário hildebrando' as status,
    au.id,
    au.email,
    au.created_at
FROM auth.users au
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 3. Verificar perfil atual
SELECT 
    'Perfil atual' as status,
    p.*
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 4. Verificar roles na tabela user_roles
SELECT 
    'Roles na tabela user_roles' as status,
    ur.*,
    au.email
FROM public.user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 5. Testar a função get_user_role diretamente
SELECT 
    'Teste da função get_user_role' as status,
    public.get_user_role(au.id) as role_result,
    au.email
FROM auth.users au
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 6. Verificar se as funções de permissão funcionam
SELECT 
    'Teste das funções de permissão' as status,
    public.has_role(au.id, 'super_admin'::app_role) as has_super_admin,
    public.has_role(au.id, 'admin'::app_role) as has_admin,
    public.has_role(au.id, 'user'::app_role) as has_user,
    au.email
FROM auth.users au
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 7. CORREÇÃO: Garantir que o usuário tenha super_admin
DO $$
DECLARE
    user_id_var UUID;
BEGIN
    -- Pegar ID do usuário
    SELECT id INTO user_id_var 
    FROM auth.users 
    WHERE email = 'hildebrando.cardoso@tvdoutor.com.br';
    
    IF user_id_var IS NOT NULL THEN
        -- Adicionar coluna super_admin se não existir
        BEGIN
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS super_admin boolean DEFAULT false;
        EXCEPTION WHEN duplicate_column THEN
            -- Coluna já existe, continuar
        END;
        
        -- Atualizar/criar perfil
        INSERT INTO public.profiles (
            id, email, full_name, display_name, role, super_admin, created_at, updated_at
        ) VALUES (
            user_id_var, 'hildebrando.cardoso@tvdoutor.com.br', 'Hildebrando Cardoso', 
            'Hildebrando Cardoso', 'admin', true, now(), now()
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = 'Hildebrando Cardoso',
            display_name = 'Hildebrando Cardoso',
            role = 'admin',
            super_admin = true,
            updated_at = now();
        
        -- Limpar roles existentes e adicionar super_admin
        DELETE FROM public.user_roles WHERE user_id = user_id_var;
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (user_id_var, 'super_admin'::app_role, now());
        
        RAISE NOTICE 'Usuário % configurado como super_admin', 'hildebrando.cardoso@tvdoutor.com.br';
    ELSE
        RAISE NOTICE 'Usuário % não encontrado!', 'hildebrando.cardoso@tvdoutor.com.br';
    END IF;
END $$;

-- 8. Verificação final
SELECT 
    'RESULTADO FINAL' as status,
    au.email,
    p.full_name,
    p.role as profile_role,
    p.super_admin,
    ur.role as user_role,
    public.get_user_role(au.id) as function_result,
    public.has_role(au.id, 'super_admin'::app_role) as has_super_admin_permission
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

