-- Migração simples para adicionar colunas agencia_id e projeto_id à tabela campaigns
-- Esta migração é independente e não depende de outras tabelas

-- Verificar se as colunas já existem antes de adicionar
DO $$
BEGIN
    -- Adicionar coluna agencia_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'agencia_id' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.campaigns 
        ADD COLUMN agencia_id UUID;
        
        -- Criar índice para performance
        CREATE INDEX IF NOT EXISTS idx_campaigns_agencia_id ON public.campaigns(agencia_id);
    END IF;

    -- Adicionar coluna projeto_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'projeto_id' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.campaigns 
        ADD COLUMN projeto_id UUID;
        
        -- Criar índice para performance
        CREATE INDEX IF NOT EXISTS idx_campaigns_projeto_id ON public.campaigns(projeto_id);
    END IF;
END $$;
