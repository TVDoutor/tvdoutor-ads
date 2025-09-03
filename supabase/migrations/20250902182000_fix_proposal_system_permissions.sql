-- Fix all proposal system related table permissions
-- Date: 2025-09-02

BEGIN;

-- Fix proposal_screens table permissions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposal_screens' AND table_schema = 'public') THEN
        -- Enable RLS
        ALTER TABLE public.proposal_screens ENABLE ROW LEVEL SECURITY;
        
        -- Grant sequence permissions if exists
        IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'proposal_screens_id_seq' AND sequence_schema = 'public') THEN
            GRANT USAGE ON SEQUENCE public.proposal_screens_id_seq TO authenticated;
        END IF;
        
        -- Remove existing policies
        DROP POLICY IF EXISTS "proposal_screens_owner_or_admin" ON public.proposal_screens;
        DROP POLICY IF EXISTS "proposal_screens_insert" ON public.proposal_screens;
        DROP POLICY IF EXISTS "proposal_screens_select" ON public.proposal_screens;
        DROP POLICY IF EXISTS "proposal_screens_update" ON public.proposal_screens;
        DROP POLICY IF EXISTS "proposal_screens_delete" ON public.proposal_screens;
        
        -- Create new policies
        CREATE POLICY "proposal_screens_insert"
            ON public.proposal_screens
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
            
        CREATE POLICY "proposal_screens_select"
            ON public.proposal_screens
            FOR SELECT
            TO authenticated
            USING (true);
            
        CREATE POLICY "proposal_screens_update"
            ON public.proposal_screens
            FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
            
        CREATE POLICY "proposal_screens_delete"
            ON public.proposal_screens
            FOR DELETE
            TO authenticated
            USING (true);
    END IF;
END $$;

-- Ensure venue_audience_monthly has proper read permissions for proposal calculations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_audience_monthly' AND table_schema = 'public') THEN
        -- Remove existing policies
        DROP POLICY IF EXISTS "venue_audience_monthly_read" ON public.venue_audience_monthly;
        DROP POLICY IF EXISTS "Admin access only - venue_audience_monthly" ON public.venue_audience_monthly;
        
        -- Allow authenticated users to read venue audience data (needed for calculations)
        CREATE POLICY "venue_audience_monthly_read"
            ON public.venue_audience_monthly
            FOR SELECT
            TO authenticated
            USING (true);
            
        -- Only admins can modify
        CREATE POLICY "venue_audience_monthly_admin_write"
            ON public.venue_audience_monthly
            FOR ALL
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());
    END IF;
END $$;

-- Fix any missing permissions on related sequences
DO $$
DECLARE
    seq_name text;
BEGIN
    -- Grant usage on all sequences that might be used by the proposal system
    FOR seq_name IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public' 
        AND sequence_name LIKE '%proposal%'
    LOOP
        EXECUTE format('GRANT USAGE ON SEQUENCE public.%I TO authenticated', seq_name);
    END LOOP;
END $$;

COMMIT;


