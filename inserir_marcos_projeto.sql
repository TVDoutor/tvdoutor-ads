-- Script SQL para inserir marcos do projeto
-- Execute este script no Supabase SQL Editor

-- Primeiro, vamos ver quais projetos existem
SELECT 
    id,
    nome_projeto,
    status_projeto,
    created_at
FROM public.agencia_projetos 
ORDER BY created_at DESC
LIMIT 5;

-- Substitua 'SEU_PROJETO_ID_AQUI' pelo ID real do projeto que você quer usar
-- Você pode copiar o ID da consulta acima

-- Exemplo de inserção (substitua o ID):
/*
INSERT INTO public.agencia_projeto_marcos (projeto_id, nome_marco, data_prevista, status, ordem)
VALUES 
    ('SEU_PROJETO_ID_AQUI', 'Kick-off e Aprovação do Briefing', '2025-09-15', 'pendente', 1),
    ('SEU_PROJETO_ID_AQUI', 'Aprovação das Peças Criativas', '2025-09-30', 'pendente', 2),
    ('SEU_PROJETO_ID_AQUI', 'Publicação da Campanha', '2025-11-01', 'pendente', 3),
    ('SEU_PROJETO_ID_AQUI', 'Relatório Final e Encerramento', '2025-12-05', 'pendente', 4);
*/

-- Script automático que pega o projeto mais recente:
WITH projeto_mais_recente AS (
    SELECT id, nome_projeto
    FROM public.agencia_projetos 
    ORDER BY created_at DESC 
    LIMIT 1
)
INSERT INTO public.agencia_projeto_marcos (projeto_id, nome_marco, data_prevista, status, ordem)
SELECT 
    pmr.id,
    'Kick-off e Aprovação do Briefing',
    '2025-09-15',
    'pendente',
    1
FROM projeto_mais_recente pmr
UNION ALL
SELECT 
    pmr.id,
    'Aprovação das Peças Criativas',
    '2025-09-30',
    'pendente',
    2
FROM projeto_mais_recente pmr
UNION ALL
SELECT 
    pmr.id,
    'Publicação da Campanha',
    '2025-11-01',
    'pendente',
    3
FROM projeto_mais_recente pmr
UNION ALL
SELECT 
    pmr.id,
    'Relatório Final e Encerramento',
    '2025-12-05',
    'pendente',
    4
FROM projeto_mais_recente pmr;

-- Verificar se os marcos foram inseridos corretamente
SELECT 
    apm.id,
    apm.nome_marco,
    apm.data_prevista,
    apm.status,
    apm.ordem,
    ap.nome_projeto
FROM public.agencia_projeto_marcos apm
JOIN public.agencia_projetos ap ON apm.projeto_id = ap.id
ORDER BY apm.ordem;
