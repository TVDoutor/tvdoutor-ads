-- MIGRAÇÃO: Adicionar role 'manager' ao sistema
-- Data: 2025-01-15
-- Descrição: Atualizar o enum app_role para incluir 'manager' e ajustar as funções de permissão

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

-- 7. Atualizar política para permitir que managers vejam usuários mas não os excluam
-- (Esta política será aplicada nas tabelas que precisam dessa restrição)

-- 8. Comentário explicativo sobre as novas permissões
COMMENT ON FUNCTION public.is_manager() IS 'Verifica se o usuário é manager, admin ou super_admin';
COMMENT ON FUNCTION public.can_delete_other_users() IS 'Verifica se o usuário pode excluir dados de outros usuários (apenas admin e super_admin)';
COMMENT ON FUNCTION public.can_edit_other_users() IS 'Verifica se o usuário pode editar dados de outros usuários (apenas admin e super_admin)';

-- 9. Log da migração
INSERT INTO public.migration_log (migration_name, applied_at, description) 
VALUES (
    '20250115000000_add_manager_role', 
    now(), 
    'Adicionada role manager com permissões limitadas: pode ver tudo mas só editar/excluir próprios dados'
) ON CONFLICT DO NOTHING;
