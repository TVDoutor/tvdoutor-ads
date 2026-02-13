-- Migration to add missing foreign keys and improve table relationships
-- Date: 2025-01-19

-- Fix profiles table - ensure it has proper FK to auth.users
-- Note: profiles_id_fkey constraint is already created in the profiles table creation
-- This migration only ensures the constraint exists if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Fix proposals table structure to match real schema
-- Add created_by relationship if it doesn't exist
-- Note: This will be applied only if the proposals table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        ALTER TABLE public.proposals 
        ADD COLUMN IF NOT EXISTS created_by uuid;
        
        -- Add constraint only if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'proposals_created_by_fkey' 
            AND table_name = 'proposals'
        ) THEN
            ALTER TABLE public.proposals 
            ADD CONSTRAINT proposals_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES auth.users(id);
        END IF;
    END IF;
END $$;

-- Add missing created_by fields and foreign keys for audit trail
-- Only apply if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_rules' AND table_schema = 'public') THEN
        ALTER TABLE public.price_rules 
        ADD COLUMN IF NOT EXISTS created_by uuid;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'price_rules_created_by_fkey' 
            AND table_name = 'price_rules'
        ) THEN
            ALTER TABLE public.price_rules 
            ADD CONSTRAINT price_rules_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES auth.users(id);
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_audience_monthly' AND table_schema = 'public') THEN
        ALTER TABLE public.venue_audience_monthly 
        ADD COLUMN IF NOT EXISTS created_by uuid;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'venue_audience_monthly_created_by_fkey' 
            AND table_name = 'venue_audience_monthly'
        ) THEN
            ALTER TABLE public.venue_audience_monthly 
            ADD CONSTRAINT venue_audience_monthly_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES auth.users(id);
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_billboard_data' AND table_schema = 'public') THEN
        ALTER TABLE public.stg_billboard_data 
        ADD COLUMN IF NOT EXISTS imported_by uuid;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'stg_billboard_data_imported_by_fkey' 
            AND table_name = 'stg_billboard_data'
        ) THEN
            ALTER TABLE public.stg_billboard_data 
            ADD CONSTRAINT stg_billboard_data_imported_by_fkey 
            FOREIGN KEY (imported_by) REFERENCES auth.users(id);
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_ponto' AND table_schema = 'public') THEN
        ALTER TABLE public.stg_ponto 
        ADD COLUMN IF NOT EXISTS imported_by uuid;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'stg_ponto_imported_by_fkey' 
            AND table_name = 'stg_ponto'
        ) THEN
            ALTER TABLE public.stg_ponto 
            ADD CONSTRAINT stg_ponto_imported_by_fkey 
            FOREIGN KEY (imported_by) REFERENCES auth.users(id);
        END IF;
        
        -- Add relationship between stg_ponto and screens via code
        ALTER TABLE public.stg_ponto 
        ADD COLUMN IF NOT EXISTS screen_id bigint;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'stg_ponto_screen_id_fkey' 
            AND table_name = 'stg_ponto'
        ) THEN
            ALTER TABLE public.stg_ponto 
            ADD CONSTRAINT stg_ponto_screen_id_fkey 
            FOREIGN KEY (screen_id) REFERENCES public.screens(id);
        END IF;
    END IF;
END $$;

-- Ensure proposals has proper relationship with users (for the real schema)
-- This handles the case where proposals.created_by should reference auth.users
-- Only update if proposals table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        UPDATE public.proposals 
        SET created_by = (
            SELECT id FROM auth.users 
            WHERE email = proposals.customer_email 
            LIMIT 1
        )
        WHERE created_by IS NULL AND customer_email IS NOT NULL;
    END IF;
END $$;

-- Add indexes for better performance on newly created foreign keys
-- Only create indexes if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON public.proposals(created_by);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_rules' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_price_rules_created_by ON public.price_rules(created_by);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_audience_monthly' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_venue_audience_created_by ON public.venue_audience_monthly(created_by);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_billboard_data' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_stg_billboard_imported_by ON public.stg_billboard_data(imported_by);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_ponto' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_stg_ponto_imported_by ON public.stg_ponto(imported_by);
        CREATE INDEX IF NOT EXISTS idx_stg_ponto_screen_id ON public.stg_ponto(screen_id);
    END IF;
END $$;

-- Create index for better performance on city lookups in price_rules
-- Only create if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_rules' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_price_rules_city_norm ON public.price_rules(city_norm);
        CREATE INDEX IF NOT EXISTS idx_price_rules_class ON public.price_rules(class);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_audience_monthly' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_venue_audience_monthly_venue_month ON public.venue_audience_monthly(venue_id, month);
    END IF;
END $$;

-- Add comments for better documentation
-- Only add comments if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_rules' AND table_schema = 'public') THEN
        COMMENT ON TABLE public.price_rules IS 'Pricing rules based on city and screen class';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_audience_monthly' AND table_schema = 'public') THEN
        COMMENT ON TABLE public.venue_audience_monthly IS 'Monthly audience data for venues';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_billboard_data' AND table_schema = 'public') THEN
        COMMENT ON TABLE public.stg_billboard_data IS 'Staging table for billboard data imports';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_ponto' AND table_schema = 'public') THEN
        COMMENT ON TABLE public.stg_ponto IS 'Staging table for point/screen data imports';
    END IF;
END $$;

-- Update existing records to set created_by to the first admin user (if exists)
-- This is optional and should be adjusted based on your data
-- Only run if user_roles table exists
DO $$
DECLARE
    first_admin_id uuid;
BEGIN
    -- Only proceed if user_roles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
        -- Get the first admin user ID
        SELECT id INTO first_admin_id 
        FROM auth.users 
        WHERE id IN (
            SELECT user_id FROM public.user_roles WHERE role = 'admin'
        ) 
        LIMIT 1;
        
        -- Update records if admin exists
        IF first_admin_id IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_rules' AND table_schema = 'public') THEN
                UPDATE public.price_rules 
                SET created_by = first_admin_id 
                WHERE created_by IS NULL;
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_audience_monthly' AND table_schema = 'public') THEN
                UPDATE public.venue_audience_monthly 
                SET created_by = first_admin_id 
                WHERE created_by IS NULL;
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_billboard_data' AND table_schema = 'public') THEN
                UPDATE public.stg_billboard_data 
                SET imported_by = first_admin_id 
                WHERE imported_by IS NULL;
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_ponto' AND table_schema = 'public') THEN
                UPDATE public.stg_ponto 
                SET imported_by = first_admin_id 
                WHERE imported_by IS NULL;
            END IF;
        END IF;
    END IF;
END $$;
