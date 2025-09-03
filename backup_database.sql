-- =====================================================
-- SCRIPT DE BACKUP COMPLETO - TVDoutor ADS Database
-- =====================================================
-- Data de criação: Janeiro 2025
-- Projeto: TVDoutor ADS
-- Supabase Project ID: vaogzhwzucijiyvyglls
-- 
-- Este script contém:
-- 1. Backup da estrutura do banco (DDL)
-- 2. Backup dos dados (DML)
-- 3. Backup das políticas RLS
-- 4. Backup das funções e triggers
-- 5. Backup das configurações de segurança
-- =====================================================

-- =====================================================
-- SEÇÃO 1: INFORMAÇÕES DO BACKUP
-- =====================================================

-- Informações do backup
SELECT 
    'TVDoutor ADS Database Backup' as backup_name,
    current_timestamp as backup_timestamp,
    current_user as backup_user,
    version() as postgres_version;

-- =====================================================
-- SEÇÃO 2: BACKUP DA ESTRUTURA (DDL)
-- =====================================================

-- Backup de todas as tabelas do schema public
\echo 'Iniciando backup da estrutura das tabelas...'

-- Comando para gerar DDL de todas as tabelas
-- Execute este comando no psql ou pgAdmin:
-- pg_dump -h [host] -U [user] -d [database] --schema-only --no-owner --no-privileges > structure_backup.sql

-- =====================================================
-- SEÇÃO 3: BACKUP DOS DADOS (DML)
-- =====================================================

\echo 'Iniciando backup dos dados...'

-- Backup da tabela profiles
COPY (
    SELECT * FROM profiles ORDER BY id
) TO STDOUT WITH CSV HEADER;

-- Backup da tabela agencias
COPY (
    SELECT * FROM agencias ORDER BY id
) TO STDOUT WITH CSV HEADER;

-- Backup da tabela agencia_deals
COPY (
    SELECT * FROM agencia_deals ORDER BY id
) TO STDOUT WITH CSV HEADER;

-- Backup da tabela agencia_projetos
COPY (
    SELECT * FROM agencia_projetos ORDER BY id
) TO STDOUT WITH CSV HEADER;

-- Backup da tabela screens
COPY (
    SELECT * FROM screens ORDER BY id
) TO STDOUT WITH CSV HEADER;

-- Backup da tabela proposals
COPY (
    SELECT * FROM proposals ORDER BY id
) TO STDOUT WITH CSV HEADER;

-- Backup da tabela campaigns
COPY (
    SELECT * FROM campaigns ORDER BY id
) TO STDOUT WITH CSV HEADER;

-- Backup da tabela campaign_screens
COPY (
    SELECT * FROM campaign_screens ORDER BY id
) TO STDOUT WITH CSV HEADER;

-- Backup da tabela holidays
COPY (
    SELECT * FROM holidays ORDER BY id
) TO STDOUT WITH CSV HEADER;

-- Backup da tabela email_logs
COPY (
    SELECT * FROM email_logs ORDER BY log_id
) TO STDOUT WITH CSV HEADER;

-- =====================================================
-- SEÇÃO 4: BACKUP DAS POLÍTICAS RLS
-- =====================================================

\echo 'Iniciando backup das políticas RLS...'

-- Listar todas as políticas RLS ativas
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
ORDER BY tablename, policyname;

-- Verificar status do RLS em todas as tabelas
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrls
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- SEÇÃO 5: BACKUP DAS FUNÇÕES E TRIGGERS
-- =====================================================

\echo 'Iniciando backup das funções...'

-- Listar todas as funções customizadas
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- Listar todos os triggers
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- =====================================================
-- SEÇÃO 6: BACKUP DAS CONFIGURAÇÕES DE SEGURANÇA
-- =====================================================

\echo 'Iniciando backup das configurações de segurança...'

-- Verificar usuários e roles
SELECT 
    rolname,
    rolsuper,
    rolinherit,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin,
    rolreplication,
    rolbypassrls,
    rolconnlimit,
    rolvaliduntil
FROM pg_roles
WHERE rolname NOT LIKE 'pg_%'
  AND rolname NOT IN ('postgres', 'supabase_admin', 'supabase_auth_admin')
ORDER BY rolname;

-- Verificar permissões em tabelas
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;

-- =====================================================
-- SEÇÃO 7: BACKUP DOS ÍNDICES
-- =====================================================

\echo 'Iniciando backup dos índices...'

-- Listar todos os índices customizados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;

-- =====================================================
-- SEÇÃO 8: BACKUP DAS VIEWS
-- =====================================================

\echo 'Iniciando backup das views...'

-- Listar todas as views
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- =====================================================
-- SEÇÃO 9: ESTATÍSTICAS DO BANCO
-- =====================================================

\echo 'Coletando estatísticas do banco...'

-- Contagem de registros por tabela
SELECT 
    schemaname,
    tablename,
    n_tup_ins as total_inserts,
    n_tup_upd as total_updates,
    n_tup_del as total_deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Tamanho das tabelas
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- SEÇÃO 10: COMANDOS DE BACKUP COMPLETO
-- =====================================================

/*
PARA EXECUTAR UM BACKUP COMPLETO, USE OS SEGUINTES COMANDOS:

1. BACKUP COMPLETO (Estrutura + Dados):
pg_dump -h [host] -U [user] -d [database] -f backup_completo_$(date +%Y%m%d_%H%M%S).sql

2. BACKUP APENAS DA ESTRUTURA:
pg_dump -h [host] -U [user] -d [database] --schema-only -f backup_estrutura_$(date +%Y%m%d_%H%M%S).sql

3. BACKUP APENAS DOS DADOS:
pg_dump -h [host] -U [user] -d [database] --data-only -f backup_dados_$(date +%Y%m%d_%H%M%S).sql

4. BACKUP COM COMPRESSÃO:
pg_dump -h [host] -U [user] -d [database] -Fc -f backup_comprimido_$(date +%Y%m%d_%H%M%S).dump

5. BACKUP DE TABELAS ESPECÍFICAS:
pg_dump -h [host] -U [user] -d [database] -t profiles -t agencias -t proposals -f backup_tabelas_principais_$(date +%Y%m%d_%H%M%S).sql

PARA RESTAURAR:
1. RESTAURAR BACKUP SQL:
psql -h [host] -U [user] -d [database] -f backup_file.sql

2. RESTAURAR BACKUP COMPRIMIDO:
pg_restore -h [host] -U [user] -d [database] backup_file.dump

SUBSTITUA:
[host] = Seu host do Supabase
[user] = postgres
[database] = postgres
*/

-- =====================================================
-- SEÇÃO 11: VERIFICAÇÃO DE INTEGRIDADE
-- =====================================================

\echo 'Executando verificação de integridade...'

-- Verificar constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY conrelid::regclass, conname;

-- Verificar chaves estrangeiras órfãs (exemplo para algumas tabelas principais)
SELECT 'agencia_deals' as tabela, 'agencia_id' as coluna, COUNT(*) as registros_orfaos
FROM agencia_deals ad
LEFT JOIN agencias a ON ad.agencia_id = a.id
WHERE a.id IS NULL

UNION ALL

SELECT 'proposals' as tabela, 'agencia_id' as coluna, COUNT(*) as registros_orfaos
FROM proposals p
LEFT JOIN agencias a ON p.agencia_id = a.id
WHERE a.id IS NULL;

-- =====================================================
-- FIM DO SCRIPT DE BACKUP
-- =====================================================

\echo 'Backup concluído com sucesso!'
\echo 'Verifique os arquivos gerados e teste a restauração em ambiente de desenvolvimento.'
\echo 'Mantenha backups regulares e em locais seguros.'