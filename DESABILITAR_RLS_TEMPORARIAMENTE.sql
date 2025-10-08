-- ============================================
-- DESABILITAR RLS TEMPORARIAMENTE - Execute no SQL Editor
-- ============================================
-- ATENÇÃO: Isso remove a segurança RLS temporariamente para permitir signup

-- 1. Desabilitar RLS nas tabelas problemáticas
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 2. Verificar se RLS foi desabilitado
SELECT 'Status RLS após desabilitação:' as info;
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

-- 3. Testar inserção após desabilitar RLS
SELECT 'Testando inserção após desabilitar RLS:' as info;

DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    insert_result text;
BEGIN
    BEGIN
        INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
        VALUES (test_user_id, 'teste@example.com', 'Usuário Teste', now(), now());
        
        insert_result := '✅ INSERT em profiles FUNCIONOU após desabilitar RLS';
        
        -- Limpar o registro de teste
        DELETE FROM public.profiles WHERE id = test_user_id;
        
    EXCEPTION WHEN OTHERS THEN
        insert_result := '❌ INSERT em profiles AINDA FALHA: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', insert_result;
END $$;

-- 4. Confirmar
SELECT '✅ RLS desabilitado temporariamente. Agora teste o signup!' as status;
