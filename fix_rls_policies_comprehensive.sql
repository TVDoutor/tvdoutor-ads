-- Script para corrigir políticas RLS restritivas
-- EXECUTE NO SUPABASE SQL EDITOR

-- 1. CORRIGIR POLÍTICAS DA TABELA PROFILES
-- Remover políticas restritivas existentes
DROP POLICY IF EXISTS "Users can view and edit own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to access profiles" ON public.profiles;

-- Criar política mais permissiva para profiles
CREATE POLICY "Authenticated users can access profiles"
    ON public.profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. CORRIGIR POLÍTICAS DA TABELA USER_ROLES
-- Remover políticas restritivas existentes
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only super admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;

-- Criar políticas mais permissivas para user_roles
CREATE POLICY "Authenticated users can view roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage roles"
    ON public.user_roles
    FOR ALL
    TO authenticated
    USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND (p.super_admin = true OR p.role = 'admin')
        )
    )
    WITH CHECK (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND (p.super_admin = true OR p.role = 'admin')
        )
    );

-- 3. CORRIGIR POLÍTICAS DA TABELA SCREENS
-- Verificar se há políticas restritivas e remover
DROP POLICY IF EXISTS "Admin access only - screens" ON public.screens;
DROP POLICY IF EXISTS "Users can view screens" ON public.screens;

-- Criar política permissiva para screens
CREATE POLICY "Authenticated users can access screens"
    ON public.screens
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. CORRIGIR POLÍTICAS DA TABELA CAMPAIGNS
-- Remover políticas restritivas se existirem
DROP POLICY IF EXISTS "Admin access only - campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can view campaigns" ON public.campaigns;

-- Criar política permissiva para campaigns
CREATE POLICY "Authenticated users can access campaigns"
    ON public.campaigns
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. CORRIGIR POLÍTICAS DA TABELA CAMPAIGN_SCREENS
-- Remover políticas restritivas se existirem
DROP POLICY IF EXISTS "Admin access only - campaign_screens" ON public.campaign_screens;

-- Criar política permissiva para campaign_screens
CREATE POLICY "Authenticated users can access campaign_screens"
    ON public.campaign_screens
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. GARANTIR QUE O HILDEBRANDO SEJA SUPER ADMIN
DO $$
DECLARE
    user_id_var UUID;
BEGIN
    -- Encontrar o usuário hildebrando
    SELECT id INTO user_id_var 
    FROM auth.users 
    WHERE email = 'hildebrando.cardoso@tvdoutor.com.br';
    
    IF user_id_var IS NOT NULL THEN
        -- Garantir que a coluna super_admin existe
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS super_admin boolean DEFAULT false;
        
        -- Criar/atualizar perfil
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
        
        -- Limpar e configurar role
        DELETE FROM public.user_roles WHERE user_id = user_id_var;
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (user_id_var, 'super_admin'::app_role, now());
        
        RAISE NOTICE 'Usuário hildebrando.cardoso@tvdoutor.com.br configurado como super_admin';
    ELSE
        RAISE NOTICE 'Usuário hildebrando.cardoso@tvdoutor.com.br não encontrado';
    END IF;
END $$;

-- 7. RECRIAR FUNÇÃO GET_USER_ROLE PARA SER MAIS ROBUSTA
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID DEFAULT auth.uid())
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role 
     FROM public.user_roles 
     WHERE user_id = COALESCE(_user_id, auth.uid())
     ORDER BY CASE 
       WHEN role = 'super_admin' THEN 1
       WHEN role = 'admin' THEN 2
       WHEN role = 'user' THEN 3
     END
     LIMIT 1),
    (SELECT CASE 
       WHEN super_admin = true THEN 'super_admin'::app_role
       WHEN role = 'admin' THEN 'admin'::app_role
       ELSE 'user'::app_role
     END
     FROM public.profiles 
     WHERE id = COALESCE(_user_id, auth.uid())),
    'user'::app_role
  )
$$;

-- 8. VERIFICAÇÃO FINAL
SELECT 
    'VERIFICAÇÃO FINAL - USUÁRIO HILDEBRANDO' as status,
    au.email,
    p.full_name,
    p.role as profile_role,
    p.super_admin,
    ur.role as user_role,
    public.get_user_role(au.id) as function_result
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 9. VERIFICAR ACESSO ÀS TABELAS
SELECT 
    'TESTE FINAL - ACESSO ÀS TABELAS' as status,
    (SELECT COUNT(*) FROM public.profiles) as profiles_count,
    (SELECT COUNT(*) FROM public.user_roles) as user_roles_count,
    (SELECT COUNT(*) FROM public.screens) as screens_count,
    (SELECT COUNT(*) FROM public.campaigns) as campaigns_count;

SELECT 'POLÍTICAS RLS CORRIGIDAS COM SUCESSO!' as resultado_final;

