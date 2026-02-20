-- MIGRAÇÃO: Adicionar role 'manager' ao sistema
-- Data: 2025-01-15
-- Descrição: Atualizar o enum app_role para incluir 'manager' e ajustar as funções de permissão

-- 0. Garantir que app_role existe (tipo pode ser criado em migration posterior)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'super_admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1. Adicionar 'manager' ao enum app_role (não pode estar dentro de DO block)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

-- 1b. Stub has_role (substituída em migration 20250115000001; user_roles pode não existir ainda)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_roles') THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = _role);
END;
$$;

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
-- Política para user_roles - managers podem ver roles mas não gerenciar (tabela pode não existir ainda)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_roles') THEN
    DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
    CREATE POLICY "Users can view their own roles"
      ON public.user_roles
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid() OR is_admin());
  END IF;
END $$;

-- 7. Atualizar política para permitir que managers vejam usuários mas não os excluam
-- (Esta política será aplicada nas tabelas que precisam dessa restrição)

-- 8. Comentário explicativo sobre as novas permissões
COMMENT ON FUNCTION public.is_manager() IS 'Verifica se o usuário é manager, admin ou super_admin';
COMMENT ON FUNCTION public.can_delete_other_users() IS 'Verifica se o usuário pode excluir dados de outros usuários (apenas admin e super_admin)';
COMMENT ON FUNCTION public.can_edit_other_users() IS 'Verifica se o usuário pode editar dados de outros usuários (apenas admin e super_admin)';

-- 9. Log da migração (removido - tabela migration_log não existe)
