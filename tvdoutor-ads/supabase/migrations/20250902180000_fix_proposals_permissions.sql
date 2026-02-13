-- Fix proposals table permissions
-- Date: 2025-09-02

BEGIN;

-- Fix proposals table permissions only if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        -- Habilita RLS na tabela proposals (se ainda não estiver habilitado)
        ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

        -- Grant usage on sequence to authenticated users
        GRANT USAGE ON SEQUENCE public.proposals_id_seq TO authenticated;

        -- Remove políticas existentes que possam estar conflitando
        DROP POLICY IF EXISTS "Authenticated users can insert proposals" ON public.proposals;
        DROP POLICY IF EXISTS "Users can read own proposals or admins can read all" ON public.proposals;
        DROP POLICY IF EXISTS "Users can update own proposals or admins can update all" ON public.proposals;
        DROP POLICY IF EXISTS "insert_proposals_authenticated" ON public.proposals;

        -- Permite inserts para usuários logados
        CREATE POLICY "insert_proposals_authenticated"
            ON public.proposals
            FOR INSERT
            TO authenticated
            WITH CHECK (true);

        -- Allow users to read proposals they created or admins to read all
        CREATE POLICY "select_proposals_owner_or_admin"
            ON public.proposals
            FOR SELECT
            TO authenticated
            USING (created_by = auth.uid() OR is_admin());

        -- Allow users to update their own proposals or admins to update all
        CREATE POLICY "update_proposals_owner_or_admin"
            ON public.proposals
            FOR UPDATE
            TO authenticated
            USING (created_by = auth.uid() OR is_admin())
            WITH CHECK (created_by = auth.uid() OR is_admin());

        -- Ensure the created_by column exists and has proper default
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'proposals' 
            AND column_name = 'created_by' 
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.proposals 
            ADD COLUMN created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid();
        END IF;

        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON public.proposals (created_by);
    END IF;
END $$;

COMMIT;

