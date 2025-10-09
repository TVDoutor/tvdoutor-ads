-- Script para verificar e corrigir status de admin do usuário
-- Execute este script no Supabase SQL Editor

-- 1. Verificar dados do usuário atual
SELECT 
    '=== VERIFICAÇÃO DE USUÁRIOS ===' as info;

-- Verificar todos os usuários na tabela auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users 
WHERE email LIKE '%hildebrando%' OR email LIKE '%tvdoutor%'
ORDER BY created_at DESC;

-- 2. Verificar dados do perfil
SELECT 
    '=== PERFIS ===' as info;

SELECT 
    p.id,
    p.email,
    p.full_name,
    p.super_admin,
    p.created_at
FROM profiles p
WHERE p.email LIKE '%hildebrando%' OR p.email LIKE '%tvdoutor%'
ORDER BY p.created_at DESC;

-- 3. Verificar roles atribuídas
SELECT 
    '=== ROLES ATRIBUÍDAS ===' as info;

SELECT 
    ur.user_id,
    ur.role,
    p.email,
    p.full_name
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
WHERE p.email LIKE '%hildebrando%' OR p.email LIKE '%tvdoutor%'
ORDER BY ur.created_at DESC;

-- 4. CORREÇÃO: Definir como super_admin
-- Substitua 'SEU_EMAIL_AQUI' pelo seu email real
UPDATE profiles 
SET super_admin = true,
    updated_at = now()
WHERE email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 5. CORREÇÃO: Garantir que tem role admin
-- Inserir role admin se não existir
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT 
    p.id,
    'admin',
    now(),
    now()
FROM profiles p
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br'
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'admin'
);

-- 6. Verificação final
SELECT 
    '=== VERIFICAÇÃO FINAL ===' as info;

SELECT 
    p.id,
    p.email,
    p.full_name,
    p.super_admin,
    ur.role,
    CASE 
        WHEN p.super_admin = true THEN 'SUPER ADMIN ✅'
        WHEN ur.role = 'admin' THEN 'ADMIN ✅'
        ELSE 'NÃO É ADMIN ❌'
    END as status_admin
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'admin'
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 7. Verificar se o trigger está funcionando
SELECT 
    '=== VERIFICAÇÃO DO TRIGGER ===' as info;

-- Verificar se o trigger existe
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%handle_new_user%';

-- Verificar se a função existe
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name LIKE '%handle_new_user%';
