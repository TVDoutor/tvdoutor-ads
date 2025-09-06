-- Migration: Create agencia_projetos table
-- Date: 2025-09-04
-- Description: Creates the agencia_projetos table for managing agency projects

-- 1. Create agencia_projetos table
CREATE TABLE IF NOT EXISTS public.agencia_projetos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_projeto VARCHAR(255) NOT NULL,
    deal_id UUID REFERENCES public.agencia_deals(id) ON DELETE SET NULL,
    agencia_id UUID NOT NULL REFERENCES public.agencias(id) ON DELETE CASCADE,
    status_projeto VARCHAR(20) DEFAULT 'planejamento' CHECK (status_projeto IN ('planejamento', 'ativo', 'pausado', 'concluido', 'cancelado')),
    data_inicio DATE,
    data_fim DATE,
    orcamento_projeto NUMERIC(12,2) DEFAULT 0,
    valor_gasto NUMERIC(12,2) DEFAULT 0,
    responsavel_projeto UUID REFERENCES auth.users(id),
    cliente_final VARCHAR(255),
    prioridade VARCHAR(10) DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
    progresso INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
    descricao TEXT,
    briefing TEXT,
    objetivos TEXT[],
    tags TEXT[],
    arquivos_anexos JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- 2. Enable RLS on the table
ALTER TABLE public.agencia_projetos ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for agencia_projetos
-- Allow authenticated users to read projects
CREATE POLICY "agencia_projetos_select_auth"
    ON public.agencia_projetos
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow admins to insert projects
CREATE POLICY "agencia_projetos_insert_admin"
    ON public.agencia_projetos
    FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

-- Allow admins to update projects
CREATE POLICY "agencia_projetos_update_admin"
    ON public.agencia_projetos
    FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Allow admins to delete projects
CREATE POLICY "agencia_projetos_delete_admin"
    ON public.agencia_projetos
    FOR DELETE
    TO authenticated
    USING (is_admin());

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agencia_projetos_agencia_id ON public.agencia_projetos(agencia_id);
CREATE INDEX IF NOT EXISTS idx_agencia_projetos_deal_id ON public.agencia_projetos(deal_id);
CREATE INDEX IF NOT EXISTS idx_agencia_projetos_status ON public.agencia_projetos(status_projeto);
CREATE INDEX IF NOT EXISTS idx_agencia_projetos_responsavel ON public.agencia_projetos(responsavel_projeto);
CREATE INDEX IF NOT EXISTS idx_agencia_projetos_created_by ON public.agencia_projetos(created_by);

-- 5. Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_agencia_projetos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agencia_projetos_updated_at_trigger
    BEFORE UPDATE ON public.agencia_projetos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_agencia_projetos_updated_at();

-- 6. Create trigger for created_by
CREATE OR REPLACE FUNCTION public.set_agencia_projetos_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_agencia_projetos_created_by_trigger
    BEFORE INSERT ON public.agencia_projetos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_agencia_projetos_created_by();

-- 7. Grant permissions
GRANT ALL ON public.agencia_projetos TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;



