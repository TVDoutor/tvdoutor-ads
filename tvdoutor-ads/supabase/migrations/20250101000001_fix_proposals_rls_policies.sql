-- Fix proposals table RLS policies for proper insert permissions
-- Date: 2025-01-01

BEGIN;

-- Fix proposals table RLS policies only if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        -- Remove existing policies that might be conflicting
        DROP POLICY IF EXISTS "insert_proposals_authenticated" ON public.proposals;
        DROP POLICY IF EXISTS "select_proposals_owner_or_admin" ON public.proposals;
        DROP POLICY IF EXISTS "update_proposals_owner_or_admin" ON public.proposals;
        DROP POLICY IF EXISTS "Authenticated users can insert proposals" ON public.proposals;
        DROP POLICY IF EXISTS "Users can read own proposals or admins can read all" ON public.proposals;
        DROP POLICY IF EXISTS "Users can update own proposals or admins can update all" ON public.proposals;

        -- Create new policies with proper permissions
        
        -- 1. INSERT policy: Allow authenticated users to insert proposals
        CREATE POLICY "proposals_insert_authenticated"
            ON public.proposals
            FOR INSERT
            TO authenticated
            WITH CHECK (true);

        -- 2. SELECT policy: Allow users to read their own proposals or admins to read all
        CREATE POLICY "proposals_select_owner_or_admin"
            ON public.proposals
            FOR SELECT
            TO authenticated
            USING (
                created_by = auth.uid() OR 
                is_admin() OR
                is_super_admin()
            );

        -- 3. UPDATE policy: Allow users to update their own proposals or admins to update all
        CREATE POLICY "proposals_update_owner_or_admin"
            ON public.proposals
            FOR UPDATE
            TO authenticated
            USING (
                created_by = auth.uid() OR 
                is_admin() OR
                is_super_admin()
            )
            WITH CHECK (
                created_by = auth.uid() OR 
                is_admin() OR
                is_super_admin()
            );

        -- 4. DELETE policy: Allow users to delete their own proposals or admins to delete all
        CREATE POLICY "proposals_delete_owner_or_admin"
            ON public.proposals
            FOR DELETE
            TO authenticated
            USING (
                created_by = auth.uid() OR 
                is_admin() OR
                is_super_admin()
            );

        -- Ensure the created_by column has proper default
        ALTER TABLE public.proposals 
        ALTER COLUMN created_by SET DEFAULT auth.uid();

        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON public.proposals (created_by);
        CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals (status);
        CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals (created_at);

        -- Grant necessary permissions
        GRANT USAGE ON SEQUENCE public.proposals_id_seq TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;

        RAISE NOTICE 'Proposals RLS policies updated successfully';
    ELSE
        RAISE NOTICE 'Proposals table does not exist, skipping RLS policy updates';
    END IF;
END $$;

-- Also fix proposal_screens table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposal_screens' AND table_schema = 'public') THEN
        -- Remove existing policies
        DROP POLICY IF EXISTS "proposal_screens_select_owner_or_admin" ON public.proposal_screens;
        DROP POLICY IF EXISTS "proposal_screens_insert_owner_or_admin" ON public.proposal_screens;
        DROP POLICY IF EXISTS "proposal_screens_update_owner_or_admin" ON public.proposal_screens;
        DROP POLICY IF EXISTS "proposal_screens_delete_owner_or_admin" ON public.proposal_screens;

        -- Create new policies for proposal_screens
        CREATE POLICY "proposal_screens_select_owner_or_admin"
            ON public.proposal_screens
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.proposals p 
                    WHERE p.id = proposal_screens.proposal_id 
                    AND (p.created_by = auth.uid() OR is_admin() OR is_super_admin())
                )
            );

        CREATE POLICY "proposal_screens_insert_owner_or_admin"
            ON public.proposal_screens
            FOR INSERT
            TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.proposals p 
                    WHERE p.id = proposal_screens.proposal_id 
                    AND (p.created_by = auth.uid() OR is_admin() OR is_super_admin())
                )
            );

        CREATE POLICY "proposal_screens_update_owner_or_admin"
            ON public.proposal_screens
            FOR UPDATE
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.proposals p 
                    WHERE p.id = proposal_screens.proposal_id 
                    AND (p.created_by = auth.uid() OR is_admin() OR is_super_admin())
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.proposals p 
                    WHERE p.id = proposal_screens.proposal_id 
                    AND (p.created_by = auth.uid() OR is_admin() OR is_super_admin())
                )
            );

        CREATE POLICY "proposal_screens_delete_owner_or_admin"
            ON public.proposal_screens
            FOR DELETE
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.proposals p 
                    WHERE p.id = proposal_screens.proposal_id 
                    AND (p.created_by = auth.uid() OR is_admin() OR is_super_admin())
                )
            );

        -- Grant permissions
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_screens TO authenticated;

        RAISE NOTICE 'Proposal_screens RLS policies updated successfully';
    END IF;
END $$;

COMMIT;
