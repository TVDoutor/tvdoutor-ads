-- ============================================
-- DIAGNÓSTICO COMPLETO RLS - Execute no SQL Editor
-- ============================================

-- 1. Verificar se RLS está habilitado nas tabelas
SELECT 'Status RLS nas tabelas:' as info;
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '🔴 RLS ATIVO (pode estar bloqueando)'
        ELSE '✅ RLS DESATIVO'
    END as status
FROM pg_tables 
WHERE tablename IN ('profiles', 'user_roles', 'auth.users')
ORDER BY tablename;

-- 2. Verificar TODAS as políticas existentes
SELECT 'Todas as políticas em profiles:' as info;
SELECT 
    policyname, 
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;

SELECT 'Todas as políticas em user_roles:' as info;
SELECT 
    policyname, 
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_roles' 
ORDER BY policyname;

-- 3. Verificar triggers
SELECT 'Triggers existentes:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%user%' OR trigger_name LIKE '%auth%'
ORDER BY trigger_name;

-- 4. Verificar funções
SELECT 'Funções relacionadas a usuário:' as info;
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname LIKE '%user%' OR proname LIKE '%auth%'
ORDER BY proname;

-- 5. Testar inserção direta (simulação)
SELECT 'Testando permissões de inserção:' as info;

-- Tentar inserir um registro de teste em profiles
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    insert_result text;
BEGIN
    BEGIN
        INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
        VALUES (test_user_id, 'teste@example.com', 'Usuário Teste', now(), now());
        
        -- Se chegou aqui, a inserção funcionou
        insert_result := '✅ INSERT em profiles FUNCIONOU';
        
        -- Limpar o registro de teste
        DELETE FROM public.profiles WHERE id = test_user_id;
        
    EXCEPTION WHEN OTHERS THEN
        insert_result := '❌ INSERT em profiles FALHOU: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', insert_result;
END $$;

-- 6. Verificar logs de erro recentes
SELECT 'Logs de erro recentes (últimas 24h):' as info;
SELECT 
    timestamp,
    level,
    message
FROM pg_stat_statements 
WHERE query LIKE '%profiles%' OR query LIKE '%user_roles%'
ORDER BY timestamp DESC
LIMIT 10;
