-- Script para corrigir permissões de UPDATE no Supabase
-- Execute no Supabase SQL Editor

-- 1. Verificar permissões atuais
SELECT 
    'Verificando políticas atuais' as status,
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles')
AND cmd IN ('UPDATE', 'ALL');

-- 2. Desabilitar RLS temporariamente para teste
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 3. Verificar se há constraints que impedem UPDATE
SELECT 
    'Verificando constraints' as status,
    conname,
    contype,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid IN ('public.profiles'::regclass, 'public.user_roles'::regclass)
AND contype IN ('c', 'f', 'u');

-- 4. Verificar se as colunas existem
SELECT 
    'Verificando estrutura da tabela profiles' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

SELECT 
    'Verificando estrutura da tabela user_roles' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- 5. Adicionar coluna updated_at se não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 6. Testar UPDATE manual
DO $$
DECLARE
    test_profile_id uuid;
    update_result integer;
BEGIN
    -- Pegar um perfil existente para teste
    SELECT id INTO test_profile_id 
    FROM public.profiles 
    LIMIT 1;
    
    IF test_profile_id IS NOT NULL THEN
        -- Tentar fazer UPDATE
        UPDATE public.profiles 
        SET updated_at = now() 
        WHERE id = test_profile_id;
        
        GET DIAGNOSTICS update_result = ROW_COUNT;
        RAISE NOTICE 'Teste de UPDATE bem-sucedido. Linhas afetadas: %', update_result;
    ELSE
        RAISE NOTICE 'Nenhum perfil encontrado para teste';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro no teste de UPDATE: %', SQLERRM;
END $$;

-- 7. Reabilitar RLS com políticas mais permissivas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 8. Remover políticas antigas
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.profiles;

DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.user_roles;

-- 9. Criar políticas mais permissivas para UPDATE
CREATE POLICY "Allow profile updates for admins" ON public.profiles
    FOR UPDATE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Allow profile updates for own profile" ON public.profiles
    FOR UPDATE TO authenticated 
    USING (auth.uid() = id);

CREATE POLICY "Allow role updates for admins" ON public.user_roles
    FOR UPDATE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur2
            WHERE ur2.user_id = auth.uid() 
            AND ur2.role IN ('admin', 'super_admin')
        )
    );

-- 10. Permitir SELECT para todos os usuários autenticados
CREATE POLICY "Allow profile select for authenticated" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow role select for authenticated" ON public.user_roles
    FOR SELECT TO authenticated USING (true);

-- 11. Permitir INSERT para admins
CREATE POLICY "Allow profile insert for admins" ON public.profiles
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Allow role insert for admins" ON public.user_roles
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur2
            WHERE ur2.user_id = auth.uid() 
            AND ur2.role IN ('admin', 'super_admin')
        )
    );

-- 12. Permitir DELETE para admins
CREATE POLICY "Allow profile delete for admins" ON public.profiles
    FOR DELETE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Allow role delete for admins" ON public.user_roles
    FOR DELETE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur2
            WHERE ur2.user_id = auth.uid() 
            AND ur2.role IN ('admin', 'super_admin')
        )
    );

-- 13. Verificar se as políticas foram criadas
SELECT 
    'Políticas criadas com sucesso' as status,
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles')
ORDER BY tablename, cmd;

-- 14. Mostrar usuário atual e seus roles
SELECT 
    'Usuário atual e roles' as status,
    auth.uid() as current_user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as email,
    (SELECT array_agg(role) FROM public.user_roles WHERE user_id = auth.uid()) as roles;

SELECT 'Script de correção de UPDATE executado com sucesso!' as final_status;
