-- Migration to add missing foreign keys and improve table relationships
-- Date: 2025-01-19

-- Fix profiles table - ensure it has proper FK to auth.users
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS fk_profiles_auth,
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix proposals table structure to match real schema
-- Add created_by relationship if it doesn't exist
ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS created_by uuid,
ADD CONSTRAINT proposals_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- Add missing created_by fields and foreign keys for audit trail
ALTER TABLE public.price_rules 
ADD COLUMN IF NOT EXISTS created_by uuid,
ADD CONSTRAINT price_rules_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- Add created_by to venue_audience_monthly for audit
ALTER TABLE public.venue_audience_monthly 
ADD COLUMN IF NOT EXISTS created_by uuid,
ADD CONSTRAINT venue_audience_monthly_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- Add imported_by to staging tables for tracking
ALTER TABLE public.stg_billboard_data 
ADD COLUMN IF NOT EXISTS imported_by uuid,
ADD CONSTRAINT stg_billboard_data_imported_by_fkey 
FOREIGN KEY (imported_by) REFERENCES auth.users(id);

ALTER TABLE public.stg_ponto 
ADD COLUMN IF NOT EXISTS imported_by uuid,
ADD CONSTRAINT stg_ponto_imported_by_fkey 
FOREIGN KEY (imported_by) REFERENCES auth.users(id);

-- Add relationship between stg_ponto and screens via code
ALTER TABLE public.stg_ponto 
ADD COLUMN IF NOT EXISTS screen_id bigint,
ADD CONSTRAINT stg_ponto_screen_id_fkey 
FOREIGN KEY (screen_id) REFERENCES public.screens(id);

-- Ensure proposals has proper relationship with users (for the real schema)
-- This handles the case where proposals.created_by should reference auth.users
UPDATE public.proposals 
SET created_by = (
    SELECT id FROM auth.users 
    WHERE email = proposals.customer_email 
    LIMIT 1
)
WHERE created_by IS NULL AND customer_email IS NOT NULL;

-- Add indexes for better performance on newly created foreign keys
CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON public.proposals(created_by);
CREATE INDEX IF NOT EXISTS idx_price_rules_created_by ON public.price_rules(created_by);
CREATE INDEX IF NOT EXISTS idx_venue_audience_created_by ON public.venue_audience_monthly(created_by);
CREATE INDEX IF NOT EXISTS idx_stg_billboard_imported_by ON public.stg_billboard_data(imported_by);
CREATE INDEX IF NOT EXISTS idx_stg_ponto_imported_by ON public.stg_ponto(imported_by);
CREATE INDEX IF NOT EXISTS idx_stg_ponto_screen_id ON public.stg_ponto(screen_id);

-- Create index for better performance on city lookups in price_rules
CREATE INDEX IF NOT EXISTS idx_price_rules_city_norm ON public.price_rules(city_norm);
CREATE INDEX IF NOT EXISTS idx_price_rules_class ON public.price_rules(class);

-- Create index for venue_audience_monthly queries
CREATE INDEX IF NOT EXISTS idx_venue_audience_monthly_venue_month ON public.venue_audience_monthly(venue_id, month);

-- Add comments for better documentation
COMMENT ON TABLE public.price_rules IS 'Pricing rules based on city and screen class';
COMMENT ON TABLE public.venue_audience_monthly IS 'Monthly audience data for venues';
COMMENT ON TABLE public.stg_billboard_data IS 'Staging table for billboard data imports';
COMMENT ON TABLE public.stg_ponto IS 'Staging table for point/screen data imports';

-- Update existing records to set created_by to the first admin user (if exists)
-- This is optional and should be adjusted based on your data
DO $$
DECLARE
    first_admin_id uuid;
BEGIN
    -- Get the first admin user ID
    SELECT id INTO first_admin_id 
    FROM auth.users 
    WHERE id IN (
        SELECT user_id FROM public.user_roles WHERE role = 'admin'
    ) 
    LIMIT 1;
    
    -- Update records if admin exists
    IF first_admin_id IS NOT NULL THEN
        UPDATE public.price_rules 
        SET created_by = first_admin_id 
        WHERE created_by IS NULL;
        
        UPDATE public.venue_audience_monthly 
        SET created_by = first_admin_id 
        WHERE created_by IS NULL;
        
        UPDATE public.stg_billboard_data 
        SET imported_by = first_admin_id 
        WHERE imported_by IS NULL;
        
        UPDATE public.stg_ponto 
        SET imported_by = first_admin_id 
        WHERE imported_by IS NULL;
    END IF;
END $$;
