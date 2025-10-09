-- ============================================
-- CORREÇÃO ESPECÍFICA PARA HILDEBRANDO - SUPER ADMIN
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. DESABILITAR RLS temporariamente para permitir a correção
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 2. Verificar usuário atual
SELECT '🔍 Verificando usuário hildebrando.cardoso@tvdoutor.com.br:' as info;
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.super_admin,
    p.created_at,
    p.updated_at
FROM public.profiles p
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 3. Verificar roles na tabela user_roles
SELECT '🔍 Verificando roles na tabela user_roles:' as info;
SELECT 
    ur.user_id,
    ur.role,
    ur.created_at,
    p.email
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 4. CORRIGIR O USUÁRIO HILDEBRANDO
UPDATE public.profiles 
SET 
    role = 'super_admin',
    super_admin = true,
    updated_at = now()
WHERE email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 5. Verificar se a atualização funcionou
SELECT '✅ Verificando se a correção foi aplicada:' as info;
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.super_admin,
    p.created_at,
    p.updated_at
FROM public.profiles p
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 6. Garantir que existe entrada na tabela user_roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    p.id,
    'super_admin'::app_role,
    now()
FROM public.profiles p
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br'
ON CONFLICT (user_id, role) 
DO UPDATE SET 
    role = 'super_admin'::app_role,
    created_at = now();

-- 7. Verificar roles finais
SELECT '🎯 Verificação final das roles:' as info;
SELECT 
    ur.user_id,
    ur.role,
    ur.created_at,
    p.email,
    p.super_admin
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br';

-- 8. REABILITAR RLS após a correção
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 9. Confirmar status final
SELECT '🚀 CORREÇÃO CONCLUÍDA!' as status;
SELECT '✅ hildebrando.cardoso@tvdoutor.com.br agora é Super Admin' as resultado;
SELECT '🔄 Faça logout e login novamente para aplicar as mudanças' as proximo_passo;
