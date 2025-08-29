-- Script para corrigir políticas RLS que estão bloqueando o acesso do admin
-- EXECUTE NO SUPABASE SQL EDITOR

-- 1. Verificar políticas atuais na tabela profiles
SELECT 
    'Políticas atuais na tabela profiles' as status,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 2. Verificar políticas na tabela user_roles
SELECT 
    'Políticas atuais na tabela user_roles' as status,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_roles';

-- 3. Verificar políticas na tabela screens
SELECT 
    'Políticas atuais na tabela screens' as status,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'screens';

-- 4. CORRIGIR: Remover políticas problemáticas e criar novas
-- Remover políticas antigas da tabela profiles
DROP POLICY IF EXISTS "Users can view and edit own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Criar política mais permissiva para profiles
CREATE POLICY "Allow authenticated users to access profiles"
    ON public.profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Corrigir políticas da tabela user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only super admins can manage roles" ON public.user_roles;

-- Política para visualizar roles
CREATE POLICY "Users can view roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.user_roles ur2 
            WHERE ur2.user_id = auth.uid() 
            AND ur2.role IN ('admin', 'super_admin')
        )
    );

-- Política para gerenciar roles (apenas super admins)
CREATE POLICY "Super admins can manage roles"
    ON public.user_roles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- 6. Garantir que as funções de permissão funcionem corretamente
-- Recriar função get_user_role
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
    'user'::app_role
  )
$$;

-- 7. CONFIGURAR HILDEBRANDO COMO SUPER ADMIN
DO $$
DECLARE
    user_id_var UUID;
BEGIN
    -- Encontrar o usuário
    SELECT id INTO user_id_var 
    FROM auth.users 
    WHERE email = 'hildebrando.cardoso@tvdoutor.com.br';
    
    IF user_id_var IS NOT NULL THEN
        -- Adicionar coluna super_admin se necessário
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
    END IF;
END $$;

-- 8. Verificação final
SELECT 
    'VERIFICAÇÃO FINAL - DADOS DO USUÁRIO' as status,
    au.email,
    p.full_name,
    p.role as profile_role,
    p.super_admin,
    ur.role as user_role
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 9. Testar funções
SELECT 
    'VERIFICAÇÃO FINAL - FUNÇÕES' as status,
    public.get_user_role(au.id) as get_user_role_result,
    public.has_role(au.id, 'super_admin'::app_role) as has_super_admin,
    public.is_super_admin() as is_super_admin_when_authenticated_as_user
FROM auth.users au
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

SELECT 'CORREÇÃO APLICADA COM SUCESSO!' as resultado;

