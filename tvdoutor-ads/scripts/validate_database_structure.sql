-- Script para validar a estrutura do banco de dados
-- Execute no Supabase SQL Editor

-- ====================================================================
-- ETAPA 5: VALIDAÇÃO DA ESTRUTURA DAS TABELAS
-- ====================================================================

-- 1. Verificar estrutura da tabela profiles
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICANDO TABELA PROFILES ===';
END $$;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Verificar estrutura da tabela user_roles
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICANDO TABELA USER_ROLES ===';
END $$;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- 3. Verificar se RLS está habilitado
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICANDO RLS (ROW LEVEL SECURITY) ===';
END $$;

SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'user_roles');

-- 4. Verificar políticas RLS da tabela profiles
DO $$
BEGIN
  RAISE NOTICE '=== POLÍTICAS RLS - PROFILES ===';
END $$;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- 5. Verificar políticas RLS da tabela user_roles
DO $$
BEGIN
  RAISE NOTICE '=== POLÍTICAS RLS - USER_ROLES ===';
END $$;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_roles';

-- 6. Verificar se o trigger on_auth_user_created existe
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICANDO TRIGGERS ===';
END $$;

SELECT 
  trigger_schema,
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name LIKE '%handle_new_user%'
ORDER BY trigger_name;

-- 7. Verificar função handle_new_user
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICANDO FUNÇÃO HANDLE_NEW_USER ===';
END $$;

SELECT 
  routine_schema,
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- 8. Ver código da função handle_new_user
SELECT 
  pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'handle_new_user'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 9. Verificar constraints da tabela profiles
DO $$
BEGIN
  RAISE NOTICE '=== CONSTRAINTS - PROFILES ===';
END $$;

SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'x' THEN 'EXCLUSION'
  END AS constraint_type_desc,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'profiles';

-- 10. Verificar constraints da tabela user_roles
DO $$
BEGIN
  RAISE NOTICE '=== CONSTRAINTS - USER_ROLES ===';
END $$;

SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'x' THEN 'EXCLUSION'
  END AS constraint_type_desc,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'user_roles';

-- 11. Verificar índices
DO $$
BEGIN
  RAISE NOTICE '=== ÍNDICES ===';
END $$;

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'user_roles')
ORDER BY tablename, indexname;

-- 12. Testar permissões (este comando pode falhar se não houver usuário autenticado)
DO $$
BEGIN
  RAISE NOTICE '=== TESTANDO PERMISSÕES ===';
  RAISE NOTICE 'Nota: Alguns testes podem falhar dependendo do contexto de execução';
END $$;

-- Verificar se conseguimos ler de profiles
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN super_admin = true THEN 1 END) as total_super_admins
FROM public.profiles;

-- Verificar se conseguimos ler de user_roles
SELECT 
  role,
  COUNT(*) as total_users
FROM public.user_roles
GROUP BY role
ORDER BY role;

-- 13. Resumo final
DO $$
DECLARE
  profiles_count INTEGER;
  user_roles_count INTEGER;
  trigger_count INTEGER;
BEGIN
  RAISE NOTICE '=== RESUMO FINAL ===';
  
  SELECT COUNT(*) INTO profiles_count FROM public.profiles;
  SELECT COUNT(*) INTO user_roles_count FROM public.user_roles;
  SELECT COUNT(*) INTO trigger_count 
  FROM information_schema.triggers 
  WHERE trigger_schema = 'auth' 
    AND event_object_table = 'users' 
    AND trigger_name LIKE '%handle_new_user%';
  
  RAISE NOTICE 'Total de profiles: %', profiles_count;
  RAISE NOTICE 'Total de user_roles: %', user_roles_count;
  RAISE NOTICE 'Triggers encontrados: %', trigger_count;
  
  IF trigger_count > 0 THEN
    RAISE NOTICE '✅ Trigger handle_new_user está ativo';
  ELSE
    RAISE WARNING '❌ Trigger handle_new_user NÃO ENCONTRADO';
  END IF;
  
  IF profiles_count > 0 THEN
    RAISE NOTICE '✅ Tabela profiles tem dados';
  ELSE
    RAISE WARNING '⚠️ Tabela profiles está vazia';
  END IF;
  
  IF user_roles_count > 0 THEN
    RAISE NOTICE '✅ Tabela user_roles tem dados';
  ELSE
    RAISE WARNING '⚠️ Tabela user_roles está vazia';
  END IF;
END $$;

