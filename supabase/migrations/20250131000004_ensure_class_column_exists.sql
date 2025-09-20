-- Ensure class column exists in screens table
-- Date: 2025-01-31

-- First, ensure the class_band enum exists
DO $$
BEGIN
    -- Create the enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'class_band') THEN
        CREATE TYPE public.class_band AS ENUM (
            'ND',  -- Not Defined (default)
            'A',   -- Class A
            'AB',  -- Class AB  
            'ABC', -- Class ABC
            'B',   -- Class B
            'BC',  -- Class BC
            'C',   -- Class C
            'CD',  -- Class CD
            'D',   -- Class D
            'E'    -- Class E
        );
        
        RAISE NOTICE 'Created class_band enum';
    ELSE
        RAISE NOTICE 'class_band enum already exists';
    END IF;
END $$;

-- Ensure the class column exists in screens table
DO $$
BEGIN
    -- Check if screens table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens' AND table_schema = 'public') THEN
        -- Check if class column exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'screens' 
            AND column_name = 'class' 
            AND table_schema = 'public'
        ) THEN
            -- Add the class column
            ALTER TABLE public.screens ADD COLUMN class class_band DEFAULT 'ND'::class_band;
            RAISE NOTICE 'Added class column to screens table';
        ELSE
            RAISE NOTICE 'class column already exists in screens table';
        END IF;
        
        -- Ensure the column has the correct type and default
        ALTER TABLE public.screens ALTER COLUMN class SET DEFAULT 'ND'::class_band;
        
        -- Update any NULL values to the default
        UPDATE public.screens SET class = 'ND'::class_band WHERE class IS NULL;
        
        -- Add comment for documentation
        COMMENT ON COLUMN public.screens.class IS 'Screen classification (ND=Not Defined, A=Class A, AB=Class AB, ABC=Class ABC, B=Class B, BC=Class BC, C=Class C, CD=Class CD, D=Class D, E=Class E)';
        
    ELSE
        RAISE NOTICE 'screens table does not exist';
    END IF;
END $$;

-- Create index on class column if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_screens_class ON public.screens(class);

-- Verify the setup
SELECT 
    'class_band enum values: ' || array_to_string(enum_range(NULL::class_band), ', ') as enum_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'screens' AND column_name = 'class' AND table_schema = 'public')
        THEN 'class column exists in screens table'
        ELSE 'class column does NOT exist in screens table'
    END as column_status;
