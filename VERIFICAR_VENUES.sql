-- =====================================================
-- VERIFICAR VENUES - Diagnóstico Completo
-- =====================================================

-- 1. Verificar se há venues cadastrados
SELECT 
    '📊 TOTAL DE VENUES' as titulo,
    COUNT(*) as quantidade
FROM venues;

-- 2. Listar alguns venues (primeiros 10)
SELECT 
    id,
    name,
    city,
    state
FROM venues
ORDER BY name
LIMIT 10;

-- 3. Verificar permissões na tabela venues
SELECT 
    '🔒 PERMISSÕES VENUES' as titulo,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'venues'
    AND grantee IN ('authenticated', 'anon', 'service_role')
ORDER BY grantee, privilege_type;

-- 4. Verificar RLS em venues
SELECT 
    '🛡️ ROW LEVEL SECURITY' as titulo,
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'venues';

-- 5. Verificar políticas RLS em venues
SELECT 
    '📋 POLÍTICAS RLS VENUES' as titulo,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'venues';

-- 6. Testar query como authenticated
SET ROLE authenticated;
SELECT 
    '✅ TESTE COMO AUTHENTICATED' as titulo,
    COUNT(*) as venues_visiveis
FROM venues;
RESET ROLE;

-- 7. Verificar profissional_venue
SELECT 
    '🔗 VÍNCULOS EXISTENTES' as titulo,
    COUNT(*) as total_vinculos
FROM profissional_venue;
