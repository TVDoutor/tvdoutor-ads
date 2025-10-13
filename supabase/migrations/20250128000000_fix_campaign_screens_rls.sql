-- Corrigir políticas RLS da tabela campaign_screens para permitir adição de telas
-- O problema é que a política INSERT está verificando created_by = auth.uid()
-- mas o campo created_by tem DEFAULT auth.uid() e não está sendo enviado explicitamente

-- Remover política problemática de INSERT
DROP POLICY IF EXISTS "Users can create campaign screens" ON public.campaign_screens;

-- Criar nova política de INSERT que permite criação para usuários autenticados
-- O campo created_by será definido automaticamente pelo DEFAULT auth.uid()
-- Verificar se o usuário é dono da campanha através da relação com campaigns
CREATE POLICY "Authenticated users can create campaign screens" ON public.campaign_screens
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.campaigns 
            WHERE campaigns.id = campaign_screens.campaign_id 
            AND campaigns.created_by = auth.uid()
        )
    );

-- Verificar se as outras políticas estão corretas
-- (Manter as políticas existentes que estão funcionando)
