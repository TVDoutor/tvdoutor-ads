-- Fix class_band enum to include all necessary values
-- Date: 2025-01-25

-- First, let's check if the enum exists and what values it has
DO $$
BEGIN
    -- Drop the enum if it exists to recreate with all values
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'class_band') THEN
        -- First, we need to change all columns using this enum to text temporarily
        -- Only if screens table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens' AND table_schema = 'public') THEN
            ALTER TABLE public.screens ALTER COLUMN class TYPE text;
        END IF;
        
        -- Drop the enum
        DROP TYPE public.class_band;
    END IF;
END $$;

-- Create the enum with all necessary values
CREATE TYPE public.class_band AS ENUM (
    'ND',  -- Not Defined (default)
    'A',   -- Class A
    'AB',  -- Class AB  
    'B',   -- Class B
    'C',   -- Class C
    'D'    -- Class D
);

-- Change the column back to use the enum
-- Only if screens table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens' AND table_schema = 'public') THEN
        -- Remove default first
        ALTER TABLE public.screens ALTER COLUMN class DROP DEFAULT;
        
        -- Change type
        ALTER TABLE public.screens ALTER COLUMN class TYPE class_band USING class::class_band;

        -- Set default value for the enum
        ALTER TABLE public.screens ALTER COLUMN class SET DEFAULT 'ND'::class_band;

        -- Update any NULL values to the default
        UPDATE public.screens SET class = 'ND'::class_band WHERE class IS NULL;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON TYPE public.class_band IS 'Classification bands for screens: ND=Not Defined, A=Class A, AB=Class AB, B=Class B, C=Class C, D=Class D';

-- Verify the enum was created successfully
SELECT 'class_band enum created successfully with values: ' || array_to_string(enum_range(NULL::class_band), ', ') as status;
