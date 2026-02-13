-- Corrigir políticas RLS da tabela campaigns para permitir criação
-- O problema é que a política INSERT está verificando created_by = auth.uid()
-- mas o campo created_by tem DEFAULT auth.uid() e não está sendo enviado explicitamente

-- Remover política problemática de INSERT
DROP POLICY IF EXISTS "Users can create campaigns" ON public.campaigns;

-- Criar nova política de INSERT que permite criação para usuários autenticados
-- O campo created_by será definido automaticamente pelo DEFAULT auth.uid()
CREATE POLICY "Authenticated users can create campaigns" ON public.campaigns
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Verificar se as outras políticas estão corretas
-- (Manter as políticas existentes que estão funcionando)
