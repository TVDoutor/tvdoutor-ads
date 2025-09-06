-- Script de teste após correção das permissões
-- Execute este script APÓS executar o fix_permissions_immediate.sql

-- TESTE 1: Verificar usuário atual e perfil
SELECT '=== TESTE 1: USUÁRIO E PERFIL ===' as teste;
SELECT 
    auth.uid() as user_id,
    auth.email() as email,
    p.role as perfil,
    p.display_name as nome
FROM public.profiles p 
WHERE p.id = auth.uid();

-- TESTE 2: Verificar função is_admin
SELECT '=== TESTE 2: FUNÇÃO IS_ADMIN ===' as teste;
SELECT is_admin() as sou_admin;

-- TESTE 3: Verificar RLS ativo
SELECT '=== TESTE 3: STATUS RLS ===' as teste;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_ativo
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('agencia_deals', 'agencia_projetos');

-- TESTE 4: Verificar políticas ativas
SELECT '=== TESTE 4: POLÍTICAS ATIVAS ===' as teste;
SELECT 
    tablename,
    policyname,
    cmd as operacao,
    permissive
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('agencia_deals', 'agencia_projetos')
ORDER BY tablename, cmd;

-- TESTE 5: Testar SELECT nas tabelas
SELECT '=== TESTE 5: ACESSO DE LEITURA ===' as teste;
SELECT 'agencia_deals' as tabela, COUNT(*) as total_registros FROM agencia_deals;
SELECT 'agencia_projetos' as tabela, COUNT(*) as total_registros FROM agencia_projetos;

-- TESTE 6: Testar INSERT (apenas se for admin)
SELECT '=== TESTE 6: TESTE DE INSERÇÃO ===' as teste;
DO $$
BEGIN
    IF is_admin() THEN
        -- Tentar inserir um registro de teste em agencia_deals
        INSERT INTO agencia_deals (nome_deal, valor, status, agencia_id)
        VALUES ('TESTE - Deal de Teste', 1000.00, 'ativo', 1);
        
        RAISE NOTICE 'INSERT em agencia_deals: SUCESSO';
        
        -- Remover o registro de teste
        DELETE FROM agencia_deals WHERE nome_deal = 'TESTE - Deal de Teste';
        
        RAISE NOTICE 'DELETE em agencia_deals: SUCESSO';
        
    ELSE
        RAISE NOTICE 'Usuário não é admin - pular teste de INSERT';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERRO no teste de INSERT/DELETE: %', SQLERRM;
END $$;

-- TESTE 7: Verificar permissões de tabela
SELECT '=== TESTE 7: PERMISSÕES DE TABELA ===' as teste;
SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
  AND table_name IN ('agencia_deals', 'agencia_projetos')
  AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

-- RESULTADO FINAL
SELECT '=== RESULTADO FINAL ===' as teste;
SELECT 
    CASE 
        WHEN is_admin() THEN '✅ USUÁRIO ADMIN - ACESSO COMPLETO ESPERADO'
        ELSE '⚠️ USUÁRIO NÃO-ADMIN - ACESSO LIMITADO ESPERADO'
    END as status_final;

SELECT 'TESTE DE PERMISSÕES CONCLUÍDO!' as resultado;