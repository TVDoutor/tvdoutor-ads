-- ========================================
-- CORREÇÃO DO CONFLITO DE TIPOS NA TABELA USER_ROLES
-- ========================================

-- 1. Verificar se a tabela user_roles existe e qual tipo está usando
DO $$
DECLARE
    column_type TEXT;
BEGIN
    -- Obter o tipo da coluna role
    SELECT data_type INTO column_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_roles'
    AND column_name = 'role';
    
    -- Se a coluna usa TEXT em vez de USER-DEFINED (enum), precisamos garantir consistência
    IF column_type = 'text' OR column_type = 'character varying' THEN
        RAISE NOTICE 'Tabela user_roles já usa tipo TEXT, mantendo consistência';
    ELSIF column_type = 'USER-DEFINED' THEN
        RAISE NOTICE 'Tabela user_roles usa tipo ENUM, convertendo para TEXT para consistência';
        
        -- Converter coluna de enum para text
        ALTER TABLE public.user_roles 
        ALTER COLUMN role TYPE text USING role::text;
        
        ALTER TABLE public.user_roles 
        ALTER COLUMN role SET DEFAULT 'user';
    END IF;
END $$;

-- 2. Garantir que as funções usam o tipo text em vez de app_role
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

-- 3. Garantir que o trigger handle_new_user usa text
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Inserir role na tabela user_roles (usando text)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log o erro mas não impedir a criação do usuário
        RAISE WARNING 'Erro no trigger handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- 4. Garantir que o trigger está ativo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Verificar e corrigir políticas RLS
DROP POLICY IF EXISTS "Allow signup to create user role" ON public.user_roles;
CREATE POLICY "Allow signup to create user role"
ON public.user_roles
FOR INSERT
TO authenticated, anon
WITH CHECK (role = 'user' AND user_id = auth.uid());

-- 6. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

