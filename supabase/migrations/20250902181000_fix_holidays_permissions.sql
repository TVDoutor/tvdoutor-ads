-- Fix holidays table permissions
-- Date: 2025-09-02

BEGIN;

-- Habilita RLS na tabela holidays
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Remove políticas existentes que possam estar conflitando
DROP POLICY IF EXISTS "holidays_read_all" ON public.holidays;
DROP POLICY IF EXISTS "holidays_admin_write" ON public.holidays;

-- Permite leitura da tabela holidays para usuários autenticados
-- (feriados são dados públicos que todos precisam acessar)
CREATE POLICY "holidays_read_all"
    ON public.holidays
    FOR SELECT
    TO authenticated
    USING (true);

-- Apenas admins podem modificar feriados
CREATE POLICY "holidays_admin_write"
    ON public.holidays
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Grant da sequência se existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'holidays_id_seq' AND sequence_schema = 'public') THEN
        GRANT USAGE ON SEQUENCE public.holidays_id_seq TO authenticated;
    END IF;
END $$;

COMMIT;
