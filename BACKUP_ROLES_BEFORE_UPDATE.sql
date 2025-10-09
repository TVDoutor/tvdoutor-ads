-- BACKUP ANTES DA ATUALIZAÇÃO DAS ROLES
-- Data: $(date)
-- Descrição: Backup das definições de roles antes de atualizar para incluir 'manager'

-- 1. Backup da estrutura atual do enum app_role
SELECT 
    'Current app_role enum values:' as info,
    unnest(enum_range(NULL::app_role)) as current_values;

-- 2. Backup dos usuários e suas roles atuais
SELECT 
    'Current user roles:' as info,
    p.id,
    p.display_name,
    p.email,
    p.role as profile_role,
    p.super_admin,
    ur.role as user_roles_role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at;

-- 3. Backup das políticas RLS relacionadas a roles
SELECT 
    'Current RLS policies:' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('profiles', 'user_roles', 'user_role_assignments')
ORDER BY tablename, policyname;

-- 4. Backup das funções relacionadas a roles
SELECT 
    'Current role functions:' as info,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('has_role', 'is_admin', 'is_super_admin', 'get_user_role', 'get_current_user_role')
AND routine_schema = 'public';

-- 5. Backup das triggers relacionadas a roles
SELECT 
    'Current role triggers:' as info,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%role%' OR trigger_name LIKE '%profile%'
ORDER BY event_object_table, trigger_name;
