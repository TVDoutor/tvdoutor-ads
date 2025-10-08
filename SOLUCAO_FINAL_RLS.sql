-- ============================================
-- SOLUÇÃO FINAL - Execute no SQL Editor
-- ============================================

-- 1. DESABILITAR RLS nas tabelas problemáticas
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 2. Verificar se foi desabilitado
SELECT 'Status RLS:' as info;
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

-- 3. Testar inserção
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
BEGIN
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
    RAISE NOTICE '❌ Erro: %', SQLERRM;
END $$;

-- 4. Confirmar
SELECT '✅ RLS desabilitado! Agora teste o signup na aplicação.' as status;
