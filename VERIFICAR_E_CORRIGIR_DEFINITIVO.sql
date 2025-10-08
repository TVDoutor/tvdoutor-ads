-- ============================================
-- VERIFICAR E CORRIGIR DEFINITIVO - Execute no SQL Editor
-- ============================================

-- 1. Verificar status atual do RLS
SELECT 'Status atual do RLS:' as info;
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '🔴 RLS ATIVO (bloqueando)'
        ELSE '✅ RLS DESABILITADO'
    END as status
FROM pg_tables 
WHERE tablename IN ('profiles', 'user_roles')
ORDER BY tablename;

-- 2. Se RLS ainda estiver ativo, desabilitar
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 3. Verificar se foi desabilitado
SELECT 'Status após desabilitação:' as info;
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '🔴 RLS AINDA ATIVO'
        ELSE '✅ RLS DESABILITADO'
    END as status
FROM pg_tables 
WHERE tablename IN ('profiles', 'user_roles')
ORDER BY tablename;

-- 4. Verificar se o trigger existe
SELECT 'Verificação do trigger:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 5. Verificar se a função handle_new_user existe
SELECT 'Verificação da função:' as info;
SELECT 
    proname as function_name,
    CASE 
        WHEN proname = 'handle_new_user' THEN '✅ Função existe'
        ELSE '❌ Função não encontrada'
    END as status
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 6. Testar inserção direta
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
BEGIN
    RAISE NOTICE 'Testando inserção direta...';
    
    -- Testar inserção em profiles
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (test_user_id, 'teste@example.com', 'Usuário Teste', now(), now());
    
    RAISE NOTICE '✅ INSERT em profiles FUNCIONOU';
    
    -- Testar inserção em user_roles
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (test_user_id, 'user', now());
    
    RAISE NOTICE '✅ INSERT em user_roles FUNCIONOU';
    
    -- Limpar registros de teste
    DELETE FROM public.user_roles WHERE user_id = test_user_id;
    DELETE FROM public.profiles WHERE id = test_user_id;
    
    RAISE NOTICE '✅ Testes concluídos com sucesso!';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro durante teste: %', SQLERRM;
END $$;

-- 7. Verificar estrutura das tabelas
SELECT 'Estrutura da tabela profiles:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Estrutura da tabela user_roles:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_roles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Confirmar
SELECT '✅ Verificação concluída! Se RLS está desabilitado, teste o signup agora.' as status;
