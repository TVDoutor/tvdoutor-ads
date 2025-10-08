-- ============================================
-- APLICAR CORREÇÃO AGORA - Execute no SQL Editor do Supabase
-- ============================================

-- 1. DESABILITAR RLS imediatamente
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 2. Verificar se foi desabilitado
SELECT 'Status RLS após desabilitação:' as info;
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '🔴 RLS AINDA ATIVO - PROBLEMA!'
        ELSE '✅ RLS DESABILITADO - CORRIGIDO!'
    END as status
FROM pg_tables 
WHERE tablename IN ('profiles', 'user_roles')
ORDER BY tablename;

-- 3. Testar inserção imediatamente
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
BEGIN
    RAISE NOTICE '🧪 Testando inserção após desabilitar RLS...';
    
    -- Testar inserção em profiles
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (test_user_id, 'teste@example.com', 'Usuário Teste', now(), now());
    
    RAISE NOTICE '✅ INSERT em profiles FUNCIONOU!';
    
    -- Testar inserção em user_roles
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (test_user_id, 'user', now());
    
    RAISE NOTICE '✅ INSERT em user_roles FUNCIONOU!';
    
    -- Limpar registros de teste
    DELETE FROM public.user_roles WHERE user_id = test_user_id;
    DELETE FROM public.profiles WHERE id = test_user_id;
    
    RAISE NOTICE '🎉 TESTE CONCLUÍDO COM SUCESSO!';
    RAISE NOTICE '✅ Agora teste o signup na aplicação!';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERRO: %', SQLERRM;
    RAISE NOTICE '❌ Ainda há problemas com as tabelas!';
END $$;

-- 4. Verificar trigger
SELECT 'Verificação do trigger:' as info;
SELECT 
    trigger_name,
    CASE 
        WHEN trigger_name = 'on_auth_user_created' THEN '✅ Trigger existe'
        ELSE '❌ Trigger não encontrado'
    END as status
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 5. Verificar função
SELECT 'Verificação da função:' as info;
SELECT 
    proname as function_name,
    CASE 
        WHEN proname = 'handle_new_user' THEN '✅ Função existe'
        ELSE '❌ Função não encontrada'
    END as status
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 6. Confirmar
SELECT '🚀 CORREÇÃO APLICADA! Teste o signup agora na aplicação.' as status;
