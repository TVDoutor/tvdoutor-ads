-- Sync local schema with remote database
-- Date: 2025-01-28

-- Enable PostGIS extension for geography support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create missing enums
CREATE TYPE public.role_kind AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE public.tipo_insercao AS ENUM ('manual', 'automatica');

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
    geom GEOGRAPHY,
    class TEXT NOT NULL DEFAULT 'ND',
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

-- Create function for text normalization if it doesn't exist
CREATE OR REPLACE FUNCTION norm_text_imm(input_text TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT LOWER(TRIM(REGEXP_REPLACE(input_text, '[^a-zA-Z0-9\s]', '', 'g')));
$$;

-- Update existing records to populate computed columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens' AND table_schema = 'public') THEN
        -- Update existing records
        UPDATE public.screens 
        SET city_norm = norm_text_imm(city),
            state_norm = norm_text_imm(state)
        WHERE city_norm IS NULL OR state_norm IS NULL;
    END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for venues
CREATE POLICY "Authenticated users can read venues" ON public.venues
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can modify venues" ON public.venues
    FOR ALL USING (TRUE);

-- Create basic RLS policies for screens  
CREATE POLICY "Authenticated users can read screens" ON public.screens
    FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can modify screens" ON public.screens
    FOR ALL USING (TRUE);

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

-- Create trigger to automatically calculate geometry and normalized columns
CREATE OR REPLACE FUNCTION update_screen_computed_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Update geometry
    IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::GEOGRAPHY;
    ELSE
        NEW.geom := NULL;
    END IF;
    
    -- Update normalized fields
    NEW.city_norm := norm_text_imm(NEW.city);
    NEW.state_norm := norm_text_imm(NEW.state);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for screens table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens' AND table_schema = 'public') THEN
        CREATE TRIGGER update_screens_computed_fields_trigger
            BEFORE INSERT OR UPDATE ON public.screens
            FOR EACH ROW EXECUTE FUNCTION update_screen_computed_fields();
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE public.venues IS 'Venues/locations where screens are installed';
COMMENT ON TABLE public.screens IS 'Digital screens/billboards for advertising';
COMMENT ON COLUMN public.screens.code IS 'Unique screen code following pattern P[0-9]{4,5}(\.[0-9]+)?';
COMMENT ON COLUMN public.screens.class IS 'Screen classification (ND=Not Defined, A=Class A, AB=Class AB, B=Class B, C=Class C, D=Class D)';
COMMENT ON COLUMN public.screens.geom IS 'Geographic location as PostGIS geography point';
COMMENT ON COLUMN public.screens.tag IS 'Screen tag/brand identifier';
