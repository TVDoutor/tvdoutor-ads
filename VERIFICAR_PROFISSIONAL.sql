-- =====================================================
-- Script para Verificar se Profissionais foram Salvos
-- =====================================================

-- 1. Ver todos os profissionais cadastrados
SELECT 
    id,
    nome,
    tipo_profissional,
    registro_profissional,
    email,
    telefone,
    ativo,
    created_at
FROM profissionais_saude
ORDER BY created_at DESC;

-- 2. Contar quantos profissionais existem
SELECT COUNT(*) as total_profissionais
FROM profissionais_saude;

-- 3. Verificar profissional específico (Jose do Sinai)
SELECT *
FROM profissionais_saude
WHERE nome ILIKE '%jose%' OR nome ILIKE '%sinai%';

-- 4. Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'profissionais_saude';

-- 5. Verificar permissões
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'profissionais_saude'
    AND grantee IN ('authenticated', 'anon');

-- 6. Tentar inserir um profissional de teste
INSERT INTO profissionais_saude (
    nome,
    tipo_profissional,
    tipo_registro,
    registro_profissional,
    email,
    telefone,
    ativo
) VALUES (
    'Dr. Teste Sistema',
    'Médico',
    'CRM',
    'TEST-123-SP',
    'teste@sistema.com',
    '11999999999',
    true
) RETURNING *;

-- 7. Verificar se foi inserido
SELECT * FROM profissionais_saude WHERE nome = 'Dr. Teste Sistema';
