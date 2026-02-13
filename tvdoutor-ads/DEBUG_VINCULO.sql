-- =====================================================
-- DEBUG - Profissional Venue
-- =====================================================

-- 1. Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profissional_venue'
ORDER BY ordinal_position;

-- 2. Verificar constraints
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    CASE con.contype
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'c' THEN 'CHECK'
        ELSE con.contype::text
    END AS constraint_description
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'profissional_venue';

-- 3. Verificar políticas RLS
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profissional_venue';

-- 4. Verificar permissões
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'profissional_venue'
    AND grantee IN ('authenticated', 'anon')
ORDER BY grantee;

-- 5. Tentar INSERT manual (TESTE)
-- Substitua os valores pelos reais
/*
INSERT INTO profissional_venue (
    profissional_id,
    venue_id,
    cargo_na_unidade
) VALUES (
    'ID_DO_PROFISSIONAL_AQUI',  -- UUID do profissional
    1,                            -- ID de um venue existente
    'Teste'                       -- Cargo (pode ser null)
);
*/

-- 6. Verificar se há profissionais e venues
SELECT 'Profissionais' as tabela, COUNT(*) as total FROM profissionais_saude
UNION ALL
SELECT 'Venues' as tabela, COUNT(*) as total FROM venues
UNION ALL
SELECT 'Vínculos' as tabela, COUNT(*) as total FROM profissional_venue;
