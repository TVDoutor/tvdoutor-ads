-- Script abrangente para corrigir todos os problemas de permissão
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar o usuário atual e suas permissões
SELECT 
    'USUÁRIO ATUAL' as status,
    auth.uid() as current_user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as current_user_email;

-- 2. Garantir que o usuário Hildebrando tenha permissões de super_admin
UPDATE public.profiles 
SET super_admin = true, role = 'admin'
WHERE email = 'hildebrando.cardoso@tvdoutor.com.br';

-- Verificar se o usuário já tem o papel super_admin antes de inserir
DO $$
DECLARE
    user_id_var uuid;
    role_exists boolean;
BEGIN
    -- Obter o ID do usuário
    SELECT id INTO user_id_var FROM public.profiles WHERE email = 'hildebrando.cardoso@tvdoutor.com.br';
    
    -- Verificar se o usuário já tem o papel super_admin
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = user_id_var AND role = 'super_admin'
    ) INTO role_exists;
    
    -- Inserir o papel super_admin apenas se não existir
    IF NOT role_exists THEN
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (user_id_var, 'super_admin', now());
    ELSE
        RAISE NOTICE 'O usuário já possui o papel super_admin. Nenhuma inserção necessária.';
    END IF;
END $$;

-- 3. Temporariamente desabilitar RLS para diagnóstico
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.screens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues DISABLE ROW LEVEL SECURITY;

-- 4. Limpar políticas problemáticas
-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can access profiles" ON public.profiles;

-- User Roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin full access user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Screens
DROP POLICY IF EXISTS "Authenticated users can read screens" ON public.screens;
DROP POLICY IF EXISTS "Only admins can modify screens" ON public.screens;
DROP POLICY IF EXISTS "Admins can modify screens" ON public.screens;
DROP POLICY IF EXISTS "Super admins can do everything" ON public.screens;

-- Campaigns
DROP POLICY IF EXISTS "Authenticated users can read campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Only admins can modify campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins can modify campaigns" ON public.campaigns;

-- Venues
DROP POLICY IF EXISTS "Authenticated users can read venues" ON public.venues;
DROP POLICY IF EXISTS "Only admins can modify venues" ON public.venues;
DROP POLICY IF EXISTS "Admins can modify venues" ON public.venues;

-- 5. Criar função auxiliar para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (super_admin = true OR role IN ('admin', 'super_admin'))
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar políticas RLS mais permissivas
-- Reabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- Profiles - Políticas mais permissivas
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can do everything with profiles" ON public.profiles
    FOR ALL USING (public.is_admin());

-- User Roles - Políticas mais permissivas
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can do everything with roles" ON public.user_roles
    FOR ALL USING (public.is_admin());

-- Screens - Políticas mais permissivas
CREATE POLICY "Anyone can view screens" ON public.screens
    FOR SELECT USING (true);

CREATE POLICY "Admins can modify screens" ON public.screens
    FOR ALL USING (public.is_admin());

-- Campaigns - Políticas mais permissivas
CREATE POLICY "Anyone can view campaigns" ON public.campaigns
    FOR SELECT USING (true);

CREATE POLICY "Admins can modify campaigns" ON public.campaigns
    FOR ALL USING (public.is_admin());

-- Venues - Políticas mais permissivas
CREATE POLICY "Anyone can view venues" ON public.venues
    FOR SELECT USING (true);

CREATE POLICY "Admins can modify venues" ON public.venues
    FOR ALL USING (public.is_admin());

-- 7. Verificar se o usuário atual é reconhecido como admin
SELECT 
    'VERIFICAÇÃO FINAL' as status,
    public.is_admin() as is_admin,
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND super_admin = true
    ) as is_super_admin_in_profiles,
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    ) as has_super_admin_role;

-- 8. Criar função RPC para diagnóstico
CREATE OR REPLACE FUNCTION public.debug_permissions()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'user_id', auth.uid(),
    'email', (SELECT email FROM auth.users WHERE id = auth.uid()),
    'is_admin', public.is_admin(),
    'profile', (SELECT row_to_json(p) FROM public.profiles p WHERE p.id = auth.uid()),
    'roles', (SELECT json_agg(r.role) FROM public.user_roles r WHERE r.user_id = auth.uid())
  ) INTO result;
  
  RETURN result;
END;
$$;

SELECT 'Script de correção executado com sucesso!' as status;