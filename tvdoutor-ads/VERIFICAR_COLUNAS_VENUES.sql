-- =====================================================
-- VERIFICAR ESTRUTURA DA TABELA VENUES
-- =====================================================

-- Ver todas as colunas da tabela venues
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'venues'
ORDER BY ordinal_position;

-- Testar query simples
SELECT * FROM venues LIMIT 5;
