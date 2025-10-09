-- CORREÇÃO URGENTE: Definir usuário como admin
-- Execute este script no Supabase SQL Editor

-- IMPORTANTE: Substitua 'hildebrando.cardoso@tvdoutor.com.br' pelo seu email real

-- 1. Verificar usuário atual
SELECT 
    'VERIFICAÇÃO ATUAL' as status,
    p.id,
    p.email,
    p.full_name,
    p.super_admin,
    ur.role,
    CASE 
        WHEN p.super_admin = true THEN 'SUPER ADMIN'
        WHEN ur.role = 'admin' THEN 'ADMIN'
        ELSE 'NÃO É ADMIN'
    END as status_atual
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'admin'
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 2. CORREÇÃO: Definir como super_admin
UPDATE profiles 
SET 
    super_admin = true,
    updated_at = now()
WHERE email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 3. CORREÇÃO: Garantir role admin
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

-- 4. Verificação final
SELECT 
    'VERIFICAÇÃO FINAL' as status,
    p.id,
    p.email,
    p.full_name,
    p.super_admin,
    ur.role,
    CASE 
        WHEN p.super_admin = true THEN 'SUPER ADMIN ✅'
        WHEN ur.role = 'admin' THEN 'ADMIN ✅'
        ELSE 'NÃO É ADMIN ❌'
    END as status_final
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'admin'
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 5. Verificar todos os admins do sistema
SELECT 
    'TODOS OS ADMINS' as info,
    p.email,
    p.full_name,
    p.super_admin,
    ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.super_admin = true OR ur.role = 'admin'
ORDER BY p.super_admin DESC, ur.role;
