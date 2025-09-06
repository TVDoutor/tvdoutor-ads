-- Migration: Create agencia_deals table
-- Date: 2025-09-04
-- Description: Creates the agencia_deals table for managing agency deals

-- 1. Create agencia_deals table
CREATE TABLE IF NOT EXISTS public.agencia_deals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_deal VARCHAR(255) NOT NULL,
    agencia_id UUID NOT NULL REFERENCES public.agencias(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'pausado', 'concluido')),
    descricao TEXT,
    valor_estimado NUMERIC(12,2),
    data_inicio DATE,
    data_fim DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- 2. Enable RLS on the table
ALTER TABLE public.agencia_deals ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for agencia_deals
-- Allow authenticated users to read deals
CREATE POLICY "agencia_deals_select_auth"
    ON public.agencia_deals
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow admins to insert deals
CREATE POLICY "agencia_deals_insert_admin"
    ON public.agencia_deals
    FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

-- Allow admins to update deals
CREATE POLICY "agencia_deals_update_admin"
    ON public.agencia_deals
    FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Allow admins to delete deals
CREATE POLICY "agencia_deals_delete_admin"
    ON public.agencia_deals
    FOR DELETE
    TO authenticated
    USING (is_admin());

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agencia_deals_agencia_id ON public.agencia_deals(agencia_id);
CREATE INDEX IF NOT EXISTS idx_agencia_deals_status ON public.agencia_deals(status);
CREATE INDEX IF NOT EXISTS idx_agencia_deals_created_by ON public.agencia_deals(created_by);

-- 5. Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_agencia_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agencia_deals_updated_at_trigger
    BEFORE UPDATE ON public.agencia_deals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_agencia_deals_updated_at();

-- 6. Create trigger for created_by
CREATE OR REPLACE FUNCTION public.set_agencia_deals_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_agencia_deals_created_by_trigger
    BEFORE INSERT ON public.agencia_deals
    FOR EACH ROW
    EXECUTE FUNCTION public.set_agencia_deals_created_by();

-- 7. Grant permissions
GRANT ALL ON public.agencia_deals TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;



