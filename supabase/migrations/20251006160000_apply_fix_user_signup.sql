-- ===================================================================
-- Migration: Apply fix for user signup, profiles and user_roles trigger/RLS
-- Created: 2025-10-06
-- Purpose: Create/ensure user_roles, robust handle_new_user trigger,
-- policies to allow signup to create profiles/roles and necessary grants.
-- ===================================================================

BEGIN;

-- 1) Cria tabela user_roles se não existir
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 2) Índices/constraints
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 3) Habilitar RLS nas tabelas (se ainda não estiver habilitado)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4) Função auxiliar: has_role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- 5) Função opcional para obter role
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

  SELECT CASE WHEN super_admin THEN 'super_admin' ELSE NULL END
  INTO user_role
  FROM public.profiles
  WHERE id = _user_id;

  IF user_role IS NULL THEN
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE user_id = _user_id
    ORDER BY
      CASE role
        WHEN 'admin' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'user' THEN 3
        ELSE 4
      END
    LIMIT 1;
  END IF;

  RETURN COALESCE(user_role, 'user');
END;
$$;

-- 6) Função robusta: handle_new_user (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User');
  user_email TEXT := NEW.email;
BEGIN
  -- Tentar criar/atualizar profile sem quebrar o signup em caso de erro
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      display_name,
      full_name,
      avatar_url,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      user_email,
      user_name,
      user_name,
      NEW.raw_user_meta_data->>'avatar_url',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: error creating/updating profile for %: %', user_email, SQLERRM;
  END;

  -- Tentar inserir role 'user' (idempotente)
  BEGIN
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (NEW.id, 'user', now())
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: error creating user_role for %: %', user_email, SQLERRM;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user: unexpected error for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

-- 7) Garante que o trigger está conectado na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8) Limpar políticas antigas (se existirem)
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.profiles;
DROP POLICY IF EXISTS "Allow anon profile creation during signup" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow trigger to create profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow signup to create user role" ON public.user_roles;

-- 9) Criar políticas RLS necessárias para o processo de signup
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

CREATE POLICY "Allow profile creation during signup"
  ON public.profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

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

-- 10) Grants de execução e INSERT necessários
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon;

GRANT INSERT ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO anon;
GRANT INSERT ON public.user_roles TO authenticated;
GRANT INSERT ON public.user_roles TO anon;

COMMIT;

-- ===================================================================
-- Verificações (executar manualmente):
-- 1) Trigger em auth.users
-- SELECT trigger_name, event_manipulation, action_timing
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'auth' AND event_object_table = 'users';

-- 2) Funções:
-- SELECT proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public' AND proname IN ('handle_new_user','has_role','get_user_role');

-- 3) Políticas:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename IN ('profiles','user_roles');

-- 4) Checar counts:
-- SELECT (SELECT COUNT(*) FROM public.profiles) AS profiles_count,
--        (SELECT COUNT(*) FROM public.user_roles) AS user_roles_count;
-- ===================================================================
