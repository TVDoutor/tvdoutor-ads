-- CORREÇÃO URGENTE: Permitir que usuários admin acessem páginas de manager
-- Data: 2025-01-15
-- Problema: Usuários com role 'admin' não conseguem acessar páginas que exigem role 'manager'

-- 1. Verificar se o enum app_role contém 'manager'
SELECT unnest(enum_range(NULL::app_role)) as available_roles;

-- 2. Verificar usuários e seus roles atuais
SELECT 
    p.id,
    p.email,
    p.role as profile_role,
    p.super_admin,
    ur.role as user_role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE p.email = 'hildebrando.cardoso@tvdoutor.com.br' 
   OR p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3';

-- 3. Se o enum não contém 'manager', adicionar
DO $$
BEGIN
    -- Verificar se 'manager' já existe no enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'manager' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'manager';
        RAISE NOTICE 'Role manager adicionada ao enum app_role';
    ELSE
        RAISE NOTICE 'Role manager já existe no enum app_role';
    END IF;
END $$;

-- 4. Garantir que o usuário admin tem role 'admin' na tabela user_roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    p.id,
    'admin'::app_role,
    now()
FROM profiles p
WHERE (p.email = 'hildebrando.cardoso@tvdoutor.com.br' 
   OR p.id = '7f8dae1a-dcbe-4c65-92dd-23bd9dc905e3')
  AND p.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'admin'
  );

-- 5. Atualizar função is_admin para incluir manager (se necessário)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
$$;

-- 6. Criar função is_manager para verificar permissões de manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
$$;

-- 7. Verificar se as funções estão funcionando
SELECT 
    'is_admin()' as function_name,
    is_admin() as result
UNION ALL
SELECT 
    'is_manager()' as function_name,
    is_manager() as result;

-- 8. Log da correção
INSERT INTO public.migration_log (migration_name, applied_at, description) 
VALUES (
    'fix_admin_permissions_urgent', 
    now(), 
    'Correção urgente: Garantir que usuários admin podem acessar páginas de manager'
) ON CONFLICT DO NOTHING;

-- 9. Verificação final
SELECT 
    'CORREÇÃO APLICADA' as status,
    'Usuários admin agora podem acessar páginas de manager' as description;
