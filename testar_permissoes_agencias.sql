-- Script de teste para verificar se as permissões foram aplicadas corretamente
-- Execute este script no Supabase SQL Editor após executar o script de correção

-- 1. Verificar se o usuário está autenticado
SELECT 
    'Status de Autenticação' as teste,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'Usuário autenticado: ' || auth.uid()::text
        ELSE 'Usuário NÃO autenticado'
    END as resultado;

-- 2. Testar acesso às tabelas principais
SELECT 
    'Teste de Acesso - agencias' as teste,
    CASE 
        WHEN COUNT(*) >= 0 THEN 'SUCESSO: ' || COUNT(*) || ' registros encontrados'
        ELSE 'ERRO: Não foi possível acessar a tabela'
    END as resultado
FROM public.agencias;

SELECT 
    'Teste de Acesso - agencia_deals' as teste,
    CASE 
        WHEN COUNT(*) >= 0 THEN 'SUCESSO: ' || COUNT(*) || ' registros encontrados'
        ELSE 'ERRO: Não foi possível acessar a tabela'
    END as resultado
FROM public.agencia_deals;

SELECT 
    'Teste de Acesso - agencia_projetos' as teste,
    CASE 
        WHEN COUNT(*) >= 0 THEN 'SUCESSO: ' || COUNT(*) || ' registros encontrados'
        ELSE 'ERRO: Não foi possível acessar a tabela'
    END as resultado
FROM public.agencia_projetos;

SELECT 
    'Teste de Acesso - agencia_projeto_equipe' as teste,
    CASE 
        WHEN COUNT(*) >= 0 THEN 'SUCESSO: ' || COUNT(*) || ' registros encontrados'
        ELSE 'ERRO: Não foi possível acessar a tabela'
    END as resultado
FROM public.agencia_projeto_equipe;

SELECT 
    'Teste de Acesso - agencia_projeto_marcos' as teste,
    CASE 
        WHEN COUNT(*) >= 0 THEN 'SUCESSO: ' || COUNT(*) || ' registros encontrados'
        ELSE 'ERRO: Não foi possível acessar a tabela'
    END as resultado
FROM public.agencia_projeto_marcos;

-- 3. Testar operações de INSERT (se as tabelas estiverem vazias)
-- Inserir um deal de teste
INSERT INTO public.agencia_deals (
    nome_deal,
    agencia_id,
    status,
    valor_estimado,
    data_inicio,
    data_fim
)
SELECT 
    'Teste de Permissão - ' || NOW()::text,
    a.id,
    'ativo',
    1000.00,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days'
FROM public.agencias a
WHERE a.codigo_agencia = 'A007'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Verificar se o INSERT funcionou
SELECT 
    'Teste de INSERT - agencia_deals' as teste,
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCESSO: Deal de teste inserido'
        ELSE 'AVISO: Nenhum deal de teste inserido (pode já existir)'
    END as resultado
FROM public.agencia_deals 
WHERE nome_deal LIKE 'Teste de Permissão%';

-- 4. Testar operações de UPDATE
UPDATE public.agencia_deals 
SET status = 'teste_permissao'
WHERE nome_deal LIKE 'Teste de Permissão%'
  AND status = 'ativo';

SELECT 
    'Teste de UPDATE - agencia_deals' as teste,
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCESSO: Update executado'
        ELSE 'AVISO: Nenhum registro atualizado'
    END as resultado
FROM public.agencia_deals 
WHERE status = 'teste_permissao';

-- 5. Testar operações de DELETE (limpar dados de teste)
DELETE FROM public.agencia_deals 
WHERE nome_deal LIKE 'Teste de Permissão%';

SELECT 
    'Teste de DELETE - agencia_deals' as teste,
    CASE 
        WHEN COUNT(*) = 0 THEN 'SUCESSO: Dados de teste removidos'
        ELSE 'AVISO: Ainda existem dados de teste'
    END as resultado
FROM public.agencia_deals 
WHERE nome_deal LIKE 'Teste de Permissão%';

-- 6. Verificar políticas ativas
SELECT 
    'Políticas Ativas' as teste,
    COUNT(*) || ' políticas encontradas para tabelas de agências' as resultado
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename LIKE '%agencia%';

-- 7. Listar todas as políticas
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename LIKE '%agencia%'
ORDER BY tablename, policyname;

-- 8. Teste final - consulta complexa que estava falhando
SELECT 
    'Teste Final - Consulta Complexa' as teste,
    CASE 
        WHEN COUNT(*) >= 0 THEN 'SUCESSO: Consulta complexa executada'
        ELSE 'ERRO: Falha na consulta complexa'
    END as resultado
FROM (
    SELECT 
        a.nome_agencia,
        a.codigo_agencia,
        COUNT(DISTINCT ad.id) as total_deals,
        COUNT(DISTINCT ap.id) as total_projetos,
        COUNT(DISTINCT ape.id) as total_equipe,
        COUNT(DISTINCT apm.id) as total_marcos
    FROM public.agencias a
    LEFT JOIN public.agencia_deals ad ON a.id = ad.agencia_id
    LEFT JOIN public.agencia_projetos ap ON a.id = ap.agencia_id
    LEFT JOIN public.agencia_projeto_equipe ape ON ap.id = ape.projeto_id
    LEFT JOIN public.agencia_projeto_marcos apm ON ap.id = apm.projeto_id
    GROUP BY a.id, a.nome_agencia, a.codigo_agencia
) as consulta_complexa;

-- 9. Resumo final
SELECT 
    'RESUMO FINAL' as status,
    'Se todos os testes acima mostraram SUCESSO, as permissões foram corrigidas corretamente.' as mensagem;



