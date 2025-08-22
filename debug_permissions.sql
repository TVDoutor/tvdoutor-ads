-- Script para debug e ajuste de permissões
-- Execute no Supabase SQL Editor para verificar e corrigir permissões

-- 1. Verificar se as tabelas têm RLS habilitado
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles');

-- 2. Listar todas as políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles');

-- 3. Verificar se o usuário atual tem permissão de admin
SELECT 
    ur.user_id,
    ur.role,
    p.email,
    p.display_name
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.user_id = auth.uid();

-- 4. Temporariamente desabilitar RLS para teste (CUIDADO: só para debug)
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 5. Criar política mais permissiva para admins (temporária)
DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
CREATE POLICY "Admin full access profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admin full access user_roles" ON public.user_roles;
CREATE POLICY "Admin full access user_roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur2
            WHERE ur2.user_id = auth.uid() 
            AND ur2.role IN ('admin', 'super_admin')
        )
    );

-- 6. Verificar se há usuários na tabela auth.users sem perfil correspondente
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created,
    p.id as profile_id,
    p.created_at as profile_created
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
ORDER BY au.created_at DESC;

-- 7. Verificar logs de erros (se disponível)
-- SELECT * FROM pg_stat_statements WHERE query LIKE '%profiles%' OR query LIKE '%user_roles%';

-- 8. Testar inserção manual de perfil (substitua o UUID pelo ID do usuário atual)
-- INSERT INTO public.profiles (id, email, full_name, display_name, role) 
-- VALUES (auth.uid(), 'test@example.com', 'Test User', 'Test User', 'user');

-- 9. Verificar se há conflitos de constraints
SELECT 
    conname,
    contype,
    conrelid::regclass,
    confrelid::regclass,
    pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid IN ('public.profiles'::regclass, 'public.user_roles'::regclass);

-- 10. Mostrar estrutura atual das tabelas
\d public.profiles;
\d public.user_roles;
