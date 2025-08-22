-- Script para corrigir a tabela profiles no Supabase
-- Execute este script diretamente no SQL Editor do Supabase Dashboard
-- Data: 2025-01-21

-- 1. Adicionar campos email e full_name à tabela profiles se não existirem
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS full_name text;

-- 2. Remover função existente e recriar com campos corretos
DROP FUNCTION IF EXISTS public.ensure_profile();

CREATE FUNCTION public.ensure_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    user_profile RECORD;
    user_auth_data RECORD;
    result JSONB;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get user auth data
    SELECT 
        email,
        raw_user_meta_data->>'full_name' as full_name,
        raw_user_meta_data->>'avatar_url' as avatar_url
    INTO user_auth_data
    FROM auth.users
    WHERE id = current_user_id;

    -- Check if profile already exists
    SELECT * INTO user_profile
    FROM public.profiles
    WHERE id = current_user_id;

    -- Create profile if it doesn't exist
    IF user_profile IS NULL THEN
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            display_name,
            avatar_url,
            role,
            created_at,
            updated_at
        ) VALUES (
            current_user_id,
            user_auth_data.email,
            user_auth_data.full_name,
            COALESCE(user_auth_data.full_name, user_auth_data.email),
            user_auth_data.avatar_url,
            'user',
            now(),
            now()
        )
        RETURNING * INTO user_profile;
        
        -- Also ensure user has default role in user_roles table
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (current_user_id, 'user', now())
        ON CONFLICT (user_id, role) DO NOTHING;
        
        result := jsonb_build_object(
            'success', true,
            'created', true,
            'profile', row_to_json(user_profile)
        );
    ELSE
        -- Update existing profile with latest auth data if needed
        UPDATE public.profiles
        SET 
            email = COALESCE(user_auth_data.email, email),
            full_name = COALESCE(user_auth_data.full_name, full_name),
            display_name = COALESCE(user_auth_data.full_name, display_name, email),
            avatar_url = COALESCE(user_auth_data.avatar_url, avatar_url),
            updated_at = now()
        WHERE id = current_user_id
        RETURNING * INTO user_profile;
        
        -- Ensure user has at least default role
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (current_user_id, 'user', now())
        ON CONFLICT (user_id, role) DO NOTHING;
        
        result := jsonb_build_object(
            'success', true,
            'created', false,
            'profile', row_to_json(user_profile)
        );
    END IF;

    RETURN result;
END;
$$;

-- 3. Garantir que a função tem as permissões corretas
GRANT EXECUTE ON FUNCTION public.ensure_profile() TO authenticated;

-- 4. Remover e recriar trigger para criar perfil automaticamente quando usuário se registra
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        display_name,
        avatar_url,
        role,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        new.raw_user_meta_data->>'avatar_url',
        'user',
        now(),
        now()
    );

    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (new.id, 'user', now())
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar o trigger se não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Habilitar RLS (Row Level Security) nas tabelas se não estiver habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 7. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;

-- 8. Criar políticas RLS para a tabela profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (true);

-- 9. Atualizar perfis existentes que não têm email/full_name
UPDATE public.profiles 
SET 
    email = au.email,
    full_name = au.raw_user_meta_data->>'full_name',
    display_name = COALESCE(au.raw_user_meta_data->>'full_name', au.email, display_name)
FROM auth.users au 
WHERE profiles.id = au.id 
AND (profiles.email IS NULL OR profiles.full_name IS NULL);

-- 10. Criar perfis para usuários que não têm perfil
INSERT INTO public.profiles (id, email, full_name, display_name, role, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name',
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    'user',
    now(),
    now()
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 11. Criar roles para usuários que não têm role
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    au.id,
    'user',
    now()
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 12. Adicionar constraint única para user_roles se não existir
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

-- Verificar se tudo foi aplicado corretamente
SELECT 
    'Perfis criados' as status,
    count(*) as total
FROM public.profiles

UNION ALL

SELECT 
    'Usuários com roles' as status,
    count(*) as total
FROM public.user_roles

UNION ALL

SELECT 
    'Perfis com email' as status,
    count(*) as total
FROM public.profiles
WHERE email IS NOT NULL;
