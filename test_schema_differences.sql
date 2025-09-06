-- Script para testar diferenças no schema e identificar problemas
-- Execute este script no Supabase SQL Editor para diagnóstico

-- 1. DIAGNÓSTICO COMPLETO DAS TABELAS
SELECT 'DIAGNÓSTICO: Estrutura das tabelas agencia_deals e agencia_projetos' as info;

-- 2. Verificar todas as colunas das tabelas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('agencia_deals', 'agencia_projetos')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. Verificar especificamente se created_by existe
SELECT 
    'agencia_deals' as tabela,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'agencia_deals' 
            AND column_name = 'created_by' 
            AND table_schema = 'public'
        ) THEN 'EXISTE' 
        ELSE 'NÃO EXISTE' 
    END as coluna_created_by
UNION ALL
SELECT 
    'agencia_projetos' as tabela,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'agencia_projetos' 
            AND column_name = 'created_by' 
            AND table_schema = 'public'
        ) THEN 'EXISTE' 
        ELSE 'NÃO EXISTE' 
    END as coluna_created_by;

-- 4. Verificar políticas RLS atuais
SELECT 
    'POLÍTICAS RLS ATUAIS' as info,
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('agencia_deals', 'agencia_projetos')
ORDER BY tablename, policyname;

-- 5. Verificar se RLS está habilitado
SELECT 
    'STATUS RLS' as info,
    schemaname,
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('agencia_deals', 'agencia_projetos');

-- 6. Verificar função is_admin
SELECT 
    'FUNÇÃO IS_ADMIN' as info,
    routine_name,
    routine_type,
    CASE 
        WHEN routine_definition IS NOT NULL THEN 'EXISTE'
        ELSE 'NÃO EXISTE'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'is_admin';

-- 7. Verificar tabela profiles
SELECT 
    'TABELA PROFILES' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'profiles' 
            AND table_schema = 'public'
        ) THEN 'EXISTE' 
        ELSE 'NÃO EXISTE' 
    END as status;

-- 8. Se profiles existe, verificar estrutura
SELECT 
    'ESTRUTURA PROFILES' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 9. Verificar usuário atual
SELECT 
    'USUÁRIO ATUAL' as info,
    auth.uid() as user_id,
    auth.email() as email;

-- 10. Verificar se usuário tem perfil
SELECT 
    'PERFIL DO USUÁRIO' as info,
    id,
    full_name,
    email,
    role
FROM public.profiles 
WHERE id = auth.uid();

-- 11. Testar acesso básico às tabelas
SELECT 'TESTE DE ACESSO' as info;

SELECT 'agencia_deals' as tabela, COUNT(*) as total_registros 
FROM agencia_deals;

SELECT 'agencia_projetos' as tabela, COUNT(*) as total_registros 
FROM agencia_projetos;

-- 12. Verificar constraints e foreign keys
SELECT 
    'FOREIGN KEYS' as info,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('agencia_deals', 'agencia_projetos')
  AND tc.table_schema = 'public';