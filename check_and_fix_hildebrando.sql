-- EXECUTE ESTE SCRIPT NO SUPABASE SQL EDITOR
-- Script para verificar e corrigir permissões do hildebrando.cardoso@tvdoutor.com.br

-- PASSO 1: Verificar se o usuário existe
DO $$
DECLARE
    user_id_var UUID;
    user_email VARCHAR := 'hildebrando.cardoso@tvdoutor.com.br';
BEGIN
    -- Encontrar o ID do usuário pelo email
    SELECT id INTO user_id_var 
    FROM auth.users 
    WHERE email = user_email;
    
    IF user_id_var IS NULL THEN
        RAISE NOTICE 'ERRO: Usuário % não encontrado!', user_email;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Usuário encontrado: % (ID: %)', user_email, user_id_var;
    
    -- Verificar se a coluna super_admin existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'super_admin'
    ) THEN
        RAISE NOTICE 'Adicionando coluna super_admin à tabela profiles...';
        ALTER TABLE public.profiles ADD COLUMN super_admin boolean DEFAULT false;
    END IF;
    
    -- Criar/atualizar perfil
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        display_name,
        role,
        super_admin,
        created_at,
        updated_at
    ) VALUES (
        user_id_var,
        user_email,
        'Hildebrando Cardoso',
        'Hildebrando Cardoso',
        'admin',
        true,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = 'Hildebrando Cardoso',
        display_name = 'Hildebrando Cardoso',
        role = 'admin',
        super_admin = true,
        updated_at = now();
    
    RAISE NOTICE 'Perfil atualizado para %', user_email;
    
    -- Remover roles existentes
    DELETE FROM public.user_roles WHERE user_id = user_id_var;
    
    -- Adicionar role super_admin
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (user_id_var, 'super_admin'::app_role, now());
    
    RAISE NOTICE 'Role super_admin adicionado para %', user_email;
    
END $$;

-- PASSO 2: Verificar os resultados
SELECT 
    'VERIFICAÇÃO FINAL' as status,
    au.email,
    p.full_name,
    p.display_name,
    p.role as profile_role,
    p.super_admin,
    ur.role as user_role
FROM auth.users au
JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- PASSO 3: Testar as funções de permissão
SELECT 
    'TESTE DE PERMISSÕES' as status,
    public.has_role(
        (SELECT id FROM auth.users WHERE email = 'hildebrando.cardoso@tvdoutor.com.br'), 
        'super_admin'::app_role
    ) as has_super_admin_role;

