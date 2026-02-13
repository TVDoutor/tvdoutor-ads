-- Migration: Create agencias table
-- Date: 2025-09-04
-- Description: Creates the agencias table for managing agencies

-- 1. Create agencias table
CREATE TABLE IF NOT EXISTS public.agencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_agencia VARCHAR(255) NOT NULL,
    codigo_agencia VARCHAR(50) UNIQUE,
    cnpj VARCHAR(18) UNIQUE,
    email_empresa VARCHAR(255),
    telefone_empresa VARCHAR(20),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    taxa_porcentagem NUMERIC(5,2) DEFAULT 0,
    site VARCHAR(255),
    rua_av VARCHAR(255),
    numero VARCHAR(20),
    cep VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- 2. Enable RLS on the table
ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for agencias
-- Allow authenticated users to read agencies
CREATE POLICY "agencias_select_auth"
    ON public.agencias
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow admins to insert agencies
CREATE POLICY "agencias_insert_admin"
    ON public.agencias
    FOR INSERT
    TO authenticated
    WITH CHECK (is_admin());

-- Allow admins to update agencies
CREATE POLICY "agencias_update_admin"
    ON public.agencias
    FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Allow admins to delete agencies
CREATE POLICY "agencias_delete_admin"
    ON public.agencias
    FOR DELETE
    TO authenticated
    USING (is_admin());

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agencias_codigo ON public.agencias(codigo_agencia);
CREATE INDEX IF NOT EXISTS idx_agencias_cnpj ON public.agencias(cnpj);
CREATE INDEX IF NOT EXISTS idx_agencias_created_by ON public.agencias(created_by);

-- 5. Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_agencias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agencias_updated_at_trigger
    BEFORE UPDATE ON public.agencias
    FOR EACH ROW
    EXECUTE FUNCTION public.update_agencias_updated_at();

-- 6. Create trigger for created_by
CREATE OR REPLACE FUNCTION public.set_agencias_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_agencias_created_by_trigger
    BEFORE INSERT ON public.agencias
    FOR EACH ROW
    EXECUTE FUNCTION public.set_agencias_created_by();

-- 7. Grant permissions
GRANT ALL ON public.agencias TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;



