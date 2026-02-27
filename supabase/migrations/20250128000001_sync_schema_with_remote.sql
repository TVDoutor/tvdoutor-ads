-- Sync local schema with remote database
-- Date: 2025-01-28

-- Create missing enums
DO $$ BEGIN
    CREATE TYPE public.role_kind AS ENUM ('user', 'admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.tipo_insercao AS ENUM ('manual', 'automatica');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create venues table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.venues (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    country TEXT,
    state TEXT,
    district TEXT,
    lat DOUBLE PRECISION CHECK (lat IS NULL OR (lat >= -90 AND lat <= 90)),
    lng DOUBLE PRECISION CHECK (lng IS NULL OR (lng >= -180 AND lng <= 180)),
    geom GEOGRAPHY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    google_place_id TEXT,
    google_formatted_address TEXT
);

-- Create screens table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.screens (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE CHECK (code ~ '^P[0-9]{4,5}(\.[0-9]+)?$'),
    name TEXT,
    address_raw TEXT,
    address_norm TEXT,
    city TEXT,
    state TEXT,
    cep TEXT,
    lat DOUBLE PRECISION CHECK (lat IS NULL OR (lat >= -90 AND lat <= 90)),
    lng DOUBLE PRECISION CHECK (lng IS NULL OR (lng >= -180 AND lng <= 180)),
    geom GEOGRAPHY DEFAULT CASE
        WHEN (lat IS NOT NULL AND lng IS NOT NULL) 
        THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::GEOGRAPHY
        ELSE NULL::GEOGRAPHY
    END,
    class class_band NOT NULL DEFAULT 'ND'::class_band,
    specialty TEXT[] DEFAULT ARRAY[]::TEXT[],
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    venue_id BIGINT REFERENCES public.venues(id),
    display_name TEXT,
    board_format TEXT,
    category TEXT,
    venue_type_parent TEXT,
    venue_type_child TEXT,
    venue_type_grandchildren TEXT,
    facing TEXT,
    screen_facing TEXT,
    screen_start_time TEXT,
    screen_end_time TEXT,
    asset_url TEXT,
    city_norm TEXT,
    state_norm TEXT,
    tag TEXT NOT NULL DEFAULT 'TV Doutor',
    google_place_id TEXT,
    google_formatted_address TEXT
);

-- Function norm_text_imm already exists in remote database, skipping creation

-- Computed columns city_norm and state_norm already exist in remote database, skipping updates

-- Enable RLS on new tables
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for venues
DROP POLICY IF EXISTS "Authenticated users can read venues" ON public.venues;
CREATE POLICY "Authenticated users can read venues" ON public.venues
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can modify venues" ON public.venues;
CREATE POLICY "Admins can modify venues" ON public.venues
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Create basic RLS policies for screens
DROP POLICY IF EXISTS "Authenticated users can read screens" ON public.screens;
CREATE POLICY "Authenticated users can read screens" ON public.screens
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can modify screens" ON public.screens;
CREATE POLICY "Admins can modify screens" ON public.screens
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_venues_code ON public.venues(code);
CREATE INDEX IF NOT EXISTS idx_venues_location ON public.venues USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_screens_code ON public.screens(code);
CREATE INDEX IF NOT EXISTS idx_screens_venue_id ON public.screens(venue_id);
CREATE INDEX IF NOT EXISTS idx_screens_location ON public.screens USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_screens_city_norm ON public.screens(city_norm);
CREATE INDEX IF NOT EXISTS idx_screens_state_norm ON public.screens(state_norm);
CREATE INDEX IF NOT EXISTS idx_screens_class ON public.screens(class);
CREATE INDEX IF NOT EXISTS idx_screens_active ON public.screens(active);

-- Add comments for documentation
COMMENT ON TABLE public.venues IS 'Venues/locations where screens are installed';
COMMENT ON TABLE public.screens IS 'Digital screens/billboards for advertising';
COMMENT ON COLUMN public.screens.code IS 'Unique screen code following pattern P[0-9]{4,5}(\.[0-9]+)?';
COMMENT ON COLUMN public.screens.class IS 'Screen classification (ND=Not Defined, A=Class A, AB=Class AB, B=Class B, C=Class C, D=Class D)';
COMMENT ON COLUMN public.screens.geom IS 'Geographic location as PostGIS geography point';
COMMENT ON COLUMN public.screens.tag IS 'Screen tag/brand identifier';


