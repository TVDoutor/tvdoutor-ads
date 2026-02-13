-- Migration: Create agencia_contatos table with RLS policies
-- Date: 2025-09-05
-- Description: Creates the agencia_contatos table for managing agency contacts

-- 1. Create agencia_contatos table
CREATE TABLE IF NOT EXISTS public.agencia_contatos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agencia_id UUID NOT NULL REFERENCES public.agencias(id) ON DELETE CASCADE,
    nome_contato VARCHAR(255) NOT NULL,
    cargo VARCHAR(100),
    email_contato VARCHAR(255),
    telefone_contato VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- 2. Enable RLS on the table
ALTER TABLE public.agencia_contatos ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for agencia_contatos
-- Allow authenticated users to read contacts
CREATE POLICY "agencia_contatos_select_auth"
    ON public.agencia_contatos
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow admins to insert contacts
CREATE POLICY "agencia_contatos_insert_admin"
    ON public.agencia_contatos
    FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

-- Allow admins to update contacts
CREATE POLICY "agencia_contatos_update_admin"
    ON public.agencia_contatos
    FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Allow admins to delete contacts
CREATE POLICY "agencia_contatos_delete_admin"
    ON public.agencia_contatos
    FOR DELETE
    TO authenticated
    USING (is_admin());

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agencia_contatos_agencia_id ON public.agencia_contatos(agencia_id);
CREATE INDEX IF NOT EXISTS idx_agencia_contatos_email ON public.agencia_contatos(email_contato);
CREATE INDEX IF NOT EXISTS idx_agencia_contatos_created_by ON public.agencia_contatos(created_by);

-- 5. Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_agencia_contatos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agencia_contatos_updated_at_trigger
    BEFORE UPDATE ON public.agencia_contatos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_agencia_contatos_updated_at();

-- 6. Create trigger for created_by
CREATE OR REPLACE FUNCTION public.set_agencia_contatos_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_agencia_contatos_created_by_trigger
    BEFORE INSERT ON public.agencia_contatos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_agencia_contatos_created_by();

-- 7. Grant permissions
GRANT ALL ON public.agencia_contatos TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
