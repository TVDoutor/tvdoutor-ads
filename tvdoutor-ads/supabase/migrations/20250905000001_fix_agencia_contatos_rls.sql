-- Migration: Fix RLS policies for agencia_contatos table
-- Date: 2025-09-05
-- Description: Fixes RLS policies to allow authenticated users to insert contacts

-- Garante que o RLS está ativado para a tabela. Se já estiver, não faz nada.
ALTER TABLE public.agencia_contatos ENABLE ROW LEVEL SECURITY;

-- Remove a política antiga, se existir, para evitar erros ao rodar o script de novo.
DROP POLICY IF EXISTS "Permite inserção para usuários autenticados" ON public.agencia_contatos;
DROP POLICY IF EXISTS "agencia_contatos_insert_admin" ON public.agencia_contatos;

-- Cria a política que permite a INSERÇÃO de novos contatos.
CREATE POLICY "Permite inserção para usuários autenticados"
ON public.agencia_contatos
FOR INSERT            -- Ação que estamos liberando: INSERT
TO authenticated      -- A quem se aplica: Qualquer usuário logado
WITH CHECK (true);    -- A condição para a nova linha ser aceita. 'true' significa que qualquer inserção é permitida, desde que o usuário esteja autenticado.

-- Também permite UPDATE para usuários autenticados
DROP POLICY IF EXISTS "agencia_contatos_update_admin" ON public.agencia_contatos;
CREATE POLICY "Permite atualização para usuários autenticados"
ON public.agencia_contatos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- E permite DELETE para usuários autenticados
DROP POLICY IF EXISTS "agencia_contatos_delete_admin" ON public.agencia_contatos;
CREATE POLICY "Permite exclusão para usuários autenticados"
ON public.agencia_contatos
FOR DELETE
TO authenticated
USING (true);
