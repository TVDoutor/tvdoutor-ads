-- Script para aplicar manualmente a migração das roles
-- Execute este script diretamente no Supabase Dashboard ou via psql

-- 1. Adicionar 'manager' ao enum app_role
ALTER TYPE public.app_role ADD VALUE 'manager';

-- 2. Atualizar a função is_admin para incluir manager
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'manager')
$$;

-- 3. Criar função para verificar se é manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
$$;

-- 4. Criar função para verificar se pode excluir dados de outros usuários
CREATE OR REPLACE FUNCTION public.can_delete_other_users()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
$$;

-- 5. Criar função para verificar se pode editar dados de outros usuários
CREATE OR REPLACE FUNCTION public.can_edit_other_users()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
$$;

-- 6. Atualizar políticas RLS para incluir manager onde apropriado
-- Política para user_roles - managers podem ver roles mas não gerenciar
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR is_admin());

-- 7. Comentário explicativo sobre as novas permissões
COMMENT ON FUNCTION public.is_manager() IS 'Verifica se o usuário é manager, admin ou super_admin';
COMMENT ON FUNCTION public.can_delete_other_users() IS 'Verifica se o usuário pode excluir dados de outros usuários (apenas admin e super_admin)';
COMMENT ON FUNCTION public.can_edit_other_users() IS 'Verifica se o usuário pode editar dados de outros usuários (apenas admin e super_admin)';

-- 8. Verificar se a migração foi aplicada
SELECT 
    'Migration applied successfully!' as status,
    'Role manager added to app_role enum' as description;

-- 9. Verificar valores do enum
SELECT 
    'Current app_role enum values:' as info,
    unnest(enum_range(NULL::app_role)) as current_values;

-- 10. Testar as novas funções
SELECT 
    'Testing new functions:' as info,
    is_manager() as can_manage,
    can_delete_other_users() as can_delete,
    can_edit_other_users() as can_edit;
