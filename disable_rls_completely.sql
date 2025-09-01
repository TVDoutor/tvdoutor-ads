-- Script para DESABILITAR COMPLETAMENTE o RLS
-- Execute este script no SQL Editor do Supabase
-- ATENÇÃO: Isso remove todas as restrições de segurança

-- ========================================
-- 1. DESABILITAR RLS EM TODAS AS TABELAS
-- ========================================

SELECT '=== DESABILITANDO RLS COMPLETAMENTE ===' as info;

-- Desabilitar RLS nas tabelas principais
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS em outras tabelas
DO $$
DECLARE
    table_name TEXT;
BEGIN
    -- Lista de tabelas para desabilitar RLS
    FOR table_name IN 
        SELECT t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name IN ('screens', 'campaigns', 'venues', 'proposals', 'reports')
    LOOP
        EXECUTE 'ALTER TABLE ' || table_name || ' DISABLE ROW LEVEL SECURITY';
        RAISE NOTICE 'RLS desabilitado para tabela: %', table_name;
    END LOOP;
END $$;

-- ========================================
-- 2. REMOVER TODAS AS POLÍTICAS RLS
-- ========================================

SELECT '=== REMOVENDO TODAS AS POLÍTICAS RLS ===' as info;

DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Remover todas as políticas de todas as tabelas
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON ' || pol.tablename;
        RAISE NOTICE 'Política removida: % da tabela %', pol.policyname, pol.tablename;
    END LOOP;
END $$;

-- ========================================
-- 3. CONFIGURAR USUÁRIO HILDEBRANDO
-- ========================================

SELECT '=== CONFIGURANDO USUÁRIO HILDEBRANDO ===' as info;

-- Atualizar perfil
UPDATE profiles 
SET 
  super_admin = true,
  updated_at = now()
WHERE email = 'hildebrando.cardoso@tvdoutor.com.br';

-- Adicionar role de admin
INSERT INTO user_roles (user_id, role, created_at)
SELECT 
  au.id,
  'admin',
  now()
FROM auth.users au
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = au.id AND ur.role = 'admin'
  );

-- ========================================
-- 4. GARANTIR PERMISSÕES COMPLETAS
-- ========================================

SELECT '=== GARANTINDO PERMISSÕES COMPLETAS ===' as info;

-- Dar permissões completas para role authenticated em todas as tabelas
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN 
        SELECT t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
    LOOP
        EXECUTE 'GRANT ALL ON TABLE ' || table_name || ' TO authenticated';
        EXECUTE 'GRANT ALL ON TABLE ' || table_name || ' TO anon';
        RAISE NOTICE 'Permissões concedidas para tabela: %', table_name;
    END LOOP;
END $$;

-- ========================================
-- 5. VERIFICAR RESULTADO
-- ========================================

SELECT '=== VERIFICAÇÃO FINAL ===' as info;

-- Verificar usuário
SELECT 
  'Usuário Hildebrando' as info,
  email,
  role,
  super_admin
FROM profiles
WHERE email = 'hildebrando.cardoso@tvdoutor.com.br';

-- Verificar roles
SELECT 
  'Roles do usuário' as info,
  ur.role
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE au.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- Verificar status do RLS
SELECT 
  'Status do RLS' as info,
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN 'RLS ATIVO' ELSE 'RLS DESABILITADO' END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'user_roles', 'screens', 'campaigns', 'venues')
ORDER BY tablename;

-- Verificar políticas restantes
SELECT 
  'Políticas restantes' as info,
  COUNT(*) as total
FROM pg_policies
WHERE schemaname = 'public';

-- Testar acesso às tabelas
SELECT 
  'Teste profiles' as info,
  COUNT(*) as total
FROM profiles;

SELECT 
  'Teste user_roles' as info,
  COUNT(*) as total
FROM user_roles;

-- Testar outras tabelas se existirem
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    -- Screens
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO table_count FROM screens;
        RAISE NOTICE 'Teste screens: % registros', table_count;
    END IF;
    
    -- Campaigns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO table_count FROM campaigns;
        RAISE NOTICE 'Teste campaigns: % registros', table_count;
    END IF;
    
    -- Venues
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO table_count FROM venues;
        RAISE NOTICE 'Teste venues: % registros', table_count;
    END IF;
END $$;

SELECT '=== RLS COMPLETAMENTE DESABILITADO - ACESSO TOTAL LIBERADO ===' as resultado;
