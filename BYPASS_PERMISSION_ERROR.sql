-- ============================================
-- BYPASS PERMISSION ERROR - HILDEBRANDO SUPER ADMIN
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Verificar usuário atual
SELECT '🔍 Verificando usuário atual:' as info;
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.super_admin,
    p.created_at
FROM public.profiles p
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br'
   OR p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 2. Tentar inserção direta na tabela user_roles (sem UPDATE)
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    p.id,
    'super_admin'::app_role,
    now()
FROM public.profiles p
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br'
   OR p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Verificar se a inserção funcionou
SELECT '🎯 Verificando roles após inserção:' as info;
SELECT 
    ur.user_id,
    ur.role,
    ur.created_at,
    p.email
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br'
   OR p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 4. Verificar dados finais
SELECT '✅ VERIFICAÇÃO FINAL:' as info;
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.super_admin,
    ur.role as user_role_role,
    CASE 
        WHEN ur.role = 'super_admin' THEN '✅ SUPER ADMIN CONFIGURADO'
        ELSE '❌ AINDA NÃO É SUPER ADMIN'
    END as status
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'super_admin'
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br'
   OR p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 5. Confirmação
SELECT '🚀 VERIFICAÇÃO CONCLUÍDA!' as status;
SELECT '🔄 Recarregue a página para aplicar as mudanças' as proximo_passo;
