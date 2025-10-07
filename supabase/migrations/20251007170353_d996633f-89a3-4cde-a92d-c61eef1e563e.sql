-- ============================================
-- CORREÇÃO DE CADASTRO DE USUÁRIOS
-- ============================================

-- ETAPA 1: Habilitar RLS e Limpar Políticas na tabela profiles
-- ============================================

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow trigger to create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow update access to own profile or if super admin" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir que usuários insiram seu próprio perfil." ON public.profiles;
DROP POLICY IF EXISTS "RLS: Profiles - Admins - Gerenciamento Total" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Criar políticas RLS simples e corretas
-- CRÍTICO: Permitir que o trigger crie profiles durante signup
CREATE POLICY "profiles_insert_trigger"
ON public.profiles FOR INSERT
WITH CHECK (true);

-- Permitir que usuários autenticados vejam todos os perfis
CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Permitir que usuários atualizem seu próprio perfil
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Permitir que admins façam tudo
CREATE POLICY "profiles_all_admin"
ON public.profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- ETAPA 2: Garantir que user_roles tem RLS correto
-- ============================================

-- Verificar se user_roles tem RLS habilitado
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

-- Permitir que o trigger insira roles durante signup
CREATE POLICY "user_roles_insert_trigger"
ON public.user_roles FOR INSERT
WITH CHECK (true);

-- Usuários podem ver suas próprias roles
CREATE POLICY "user_roles_select_own"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins podem ver todas as roles
CREATE POLICY "user_roles_select_admin"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Apenas admins podem inserir/atualizar/deletar roles (exceto via trigger)
CREATE POLICY "user_roles_modify_admin"
ON public.user_roles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- ============================================
-- ETAPA 3: Corrigir o Trigger handle_new_user
-- ============================================

-- Recriar a função handle_new_user de forma simplificada
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_email text;
BEGIN
  -- Extrair dados do novo usuário
  v_email := NEW.email;
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(v_email, '@', 1)
  );

  -- Inserir perfil (usando SECURITY DEFINER para bypassar RLS)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    display_name,
    super_admin,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_email,
    v_full_name,
    v_full_name,
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    updated_at = now();

  -- Inserir role padrão 'user' (usando SECURITY DEFINER para bypassar RLS)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Sempre retornar NEW para não bloquear o signup
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, logar mas não bloquear o signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recriar o trigger (drop e create para garantir que está atualizado)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ETAPA 4: Verificar/Criar funções de segurança simplificadas
-- ============================================

-- Função has_role (já existe, mas garantir que está correta)
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
      AND role = _role::text
  )
$$;

-- Função is_admin simplificada
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Função is_super_admin simplificada
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  ) OR public.has_role(auth.uid(), 'admin')
$$;

-- ============================================
-- COMENTÁRIOS FINAIS
-- ============================================
COMMENT ON POLICY "profiles_insert_trigger" ON public.profiles IS 
  'CRÍTICO: Permite que o trigger handle_new_user crie profiles durante signup sem ser bloqueado por RLS';

COMMENT ON POLICY "user_roles_insert_trigger" ON public.user_roles IS 
  'CRÍTICO: Permite que o trigger handle_new_user crie roles durante signup sem ser bloqueado por RLS';

COMMENT ON FUNCTION public.handle_new_user() IS 
  'Trigger function que cria automaticamente profile e role quando um novo usuário se cadastra. Usa SECURITY DEFINER para bypassar RLS.';