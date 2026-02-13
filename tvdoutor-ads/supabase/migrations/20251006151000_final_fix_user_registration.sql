-- ========================================
-- CORREÇÃO FINAL DO SISTEMA DE CADASTRO DE USUÁRIOS
-- ========================================

-- 1. Garantir que a tabela user_roles existe com o tipo correto
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

-- 3. Criar função para verificar roles
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

-- 4. Criar trigger handle_new_user SIMPLIFICADO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_name TEXT;
BEGIN
    -- Obter nome do usuário dos metadados
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        'User'
    );
    
    -- Inserir profile
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
        user_name,
        user_name,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    
    -- Inserir role padrão 'user'
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log o erro mas permitir a criação do usuário
        RAISE WARNING 'Erro no trigger handle_new_user para usuário %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- 5. Remover trigger antigo e criar novo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Políticas RLS para user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow signup to create user role" ON public.user_roles;
DROP POLICY IF EXISTS "Allow trigger to insert roles" ON public.user_roles;

-- Política para usuários verem suas próprias roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política para admins verem todas as roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Política para admins gerenciarem roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Política especial para permitir o trigger inserir roles
CREATE POLICY "Allow trigger to insert roles"
ON public.user_roles
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- 7. Políticas RLS para profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow trigger to create profiles" ON public.profiles;

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

-- 8. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 9. Garantir que profiles existentes tenham roles
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
AND EXISTS (SELECT 1 FROM auth.users WHERE id = profiles.id)
ON CONFLICT (user_id, role) DO NOTHING;

