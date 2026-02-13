-- Verificar permissões da tabela user_sessions
-- Execute no Supabase SQL Editor

-- 1. Verificar se RLS está REALMENTE desabilitado
SELECT 
    schemaname,
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('user_sessions', 'user_session_history');

-- 2. Verificar permissões GRANT da tabela
SELECT 
    grantee, 
    privilege_type,
    table_schema,
    table_name
FROM information_schema.role_table_grants 
WHERE table_name IN ('user_sessions', 'user_session_history')
ORDER BY table_name, grantee;

-- 3. Ver o owner da tabela
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('user_sessions', 'user_session_history');

-- 4. CONCEDER TODAS as permissões ao role 'authenticated'
GRANT ALL ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_session_history TO authenticated;

-- 5. CONCEDER permissões ao role 'anon' também
GRANT ALL ON public.user_sessions TO anon;
GRANT ALL ON public.user_session_history TO anon;

-- 6. Verificar novamente
SELECT 
    grantee, 
    privilege_type,
    table_name
FROM information_schema.role_table_grants 
WHERE table_name IN ('user_sessions', 'user_session_history')
AND grantee IN ('authenticated', 'anon')
ORDER BY table_name, grantee;

