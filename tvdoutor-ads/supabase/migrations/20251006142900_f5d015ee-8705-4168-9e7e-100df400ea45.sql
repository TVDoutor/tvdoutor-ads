-- ========================================
-- CORREÇÃO DO SISTEMA DE CADASTRO DE USUÁRIOS - v3 (Simplificado)
-- ========================================

-- 1. Criar tabela user_roles (se não existir)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL DEFAULT 'user',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 2. Habilitar RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Criar função security definer para verificar roles (texto simples)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Criar função auxiliar para obter role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    IF _user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Verificar se é super admin
    SELECT CASE WHEN super_admin THEN 'super_admin' ELSE NULL END
    INTO user_role
    FROM public.profiles
    WHERE id = _user_id;
    
    -- Se não for super admin, pegar o role da tabela user_roles
    IF user_role IS NULL THEN
        SELECT role INTO user_role
        FROM public.user_roles
        WHERE user_id = _user_id
        ORDER BY 
            CASE role 
                WHEN 'admin' THEN 1
                WHEN 'manager' THEN 2
                WHEN 'user' THEN 3
            END
        LIMIT 1;
    END IF;
    
    RETURN COALESCE(user_role, 'user');
END;
$$;

-- 5. Corrigir trigger handle_new_user para criar profile E role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Inserir profile (sem definir role aqui)
    INSERT INTO public.profiles (
        id, 
        email, 
        display_name, 
        full_name, 
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Inserir role na tabela user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erro no trigger handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- 6. Garantir que o trigger está ativo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Políticas RLS para user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow signup to create user role" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Allow signup to create user role"
ON public.user_roles
FOR INSERT
TO authenticated, anon
WITH CHECK (role = 'user' AND user_id = auth.uid());

-- 8. Limpar políticas RLS redundantes em profiles
DROP POLICY IF EXISTS "Allow all operations on profiles" ON public.profiles;
DROP POLICY IF EXISTS "RLS: Profiles - Usuários - Gerenciamento Próprio" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow trigger to create profiles" ON public.profiles;

-- Recriar políticas essenciais
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow trigger to create profiles"
ON public.profiles
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- 9. Migrar roles existentes de profiles para user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
    id,
    CASE 
        WHEN super_admin = true THEN 'admin'
        WHEN role = 'admin' THEN 'admin'
        WHEN role = 'manager' THEN 'manager'
        ELSE 'user'
    END
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT (user_id, role) DO NOTHING;

-- 10. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);