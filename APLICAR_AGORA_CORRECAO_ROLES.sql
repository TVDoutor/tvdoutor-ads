-- ================================================================
-- CORREÇÃO URGENTE: Adicionar role 'manager' para usuários
-- Usuários afetados:
-- - publicidade5@tvdoutor.com.br
-- - publicidade6@tvdoutor.com.br
-- - suporte@tvdoutor.com.br
-- ================================================================

-- EXECUTAR NO SUPABASE DASHBOARD > SQL EDITOR

BEGIN;

-- 1. Atualizar profiles para manager
UPDATE public.profiles
SET role = 'manager', updated_at = NOW()
WHERE email IN (
    'publicidade5@tvdoutor.com.br',
    'publicidade6@tvdoutor.com.br',
    'suporte@tvdoutor.com.br'
)
AND role != 'super_admin'; -- Não alterar se for super_admin

-- 2. Adicionar/atualizar user_roles para manager
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    p.id,
    'manager'::app_role,
    NOW()
FROM public.profiles p
WHERE p.email IN (
    'publicidade5@tvdoutor.com.br',
    'publicidade6@tvdoutor.com.br',
    'suporte@tvdoutor.com.br'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Remover role 'user' desses usuários (para evitar conflito)
DELETE FROM public.user_roles
WHERE user_id IN (
    SELECT id FROM public.profiles
    WHERE email IN (
        'publicidade5@tvdoutor.com.br',
        'publicidade6@tvdoutor.com.br',
        'suporte@tvdoutor.com.br'
    )
)
AND role = 'user'::app_role;

COMMIT;

-- 4. Verificar resultado
SELECT 
    '✅ RESULTADO' as status,
    p.email,
    p.role as profile_role,
    array_agg(ur.role::TEXT ORDER BY ur.role) as user_roles,
    p.updated_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.email IN (
    'publicidade5@tvdoutor.com.br',
    'publicidade6@tvdoutor.com.br',
    'suporte@tvdoutor.com.br'
)
GROUP BY p.email, p.role, p.updated_at
ORDER BY p.email;

-- Resultado esperado:
-- ✓ profile_role: manager
-- ✓ user_roles: {manager}

