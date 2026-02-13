-- V2.0 Database Migration: Add DOOH Platform Enhancements (Fixed)

-- 1. Add new columns to screens table for audience and operational data
ALTER TABLE public.screens
ADD COLUMN IF NOT EXISTS base_daily_traffic INT;

ALTER TABLE public.screens  
ADD COLUMN IF NOT EXISTS spots_per_hour INT DEFAULT 6;

ALTER TABLE public.screens
ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{"start": "08:00", "end": "22:00"}'::jsonb;

-- Add comments separately
COMMENT ON COLUMN public.screens.base_daily_traffic IS 'Estimativa de pessoas únicas que passam pelo ponto por dia. Fonte do Alcance.';
COMMENT ON COLUMN public.screens.spots_per_hour IS 'Número de inserções/spots que um anunciante recebe por hora.';
COMMENT ON COLUMN public.screens.operating_hours IS 'Horário de funcionamento da tela.';

-- 2. Create audience_estimates table for pre-calculated data
CREATE TABLE IF NOT EXISTS public.audience_estimates (
    id SERIAL PRIMARY KEY,
    city_norm TEXT NOT NULL,
    specialty TEXT NOT NULL,
    clinic_count INTEGER NOT NULL DEFAULT 0,
    estimated_patients_monthly NUMERIC NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (city_norm, specialty)
);

COMMENT ON TABLE public.audience_estimates IS 'Dados pré-calculados para a calculadora da landing page, atualizada via Cron Job.';

-- Enable RLS for audience_estimates
ALTER TABLE public.audience_estimates ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY IF NOT EXISTS "Public can read audience estimates" 
ON public.audience_estimates 
FOR SELECT 
USING (true);

-- 3. Create view for public screens data
CREATE OR REPLACE VIEW public.vw_screens_public AS
SELECT
    s.id,
    s.code,
    s.name,
    s.display_name,
    s.city,
    s.state,
    s.lat,
    s.lng,
    s.geom,
    s.specialty,
    s.asset_url,
    s.venue_id,
    v.name AS venue_name,
    pr.base_monthly,
    s.base_daily_traffic,
    s.spots_per_hour,
    s.operating_hours,
    s.active
FROM
    public.screens s
LEFT JOIN
    public.venues v ON s.venue_id = v.id
LEFT JOIN 
    public.price_rules pr ON s.id = pr.screen_id
WHERE
    s.active = TRUE;

-- 4. Add some sample data to base_daily_traffic for testing
UPDATE public.screens 
SET base_daily_traffic = 
    CASE 
        WHEN city = 'São Paulo' THEN 1500 + (random() * 1000)::int
        WHEN city = 'Rio de Janeiro' THEN 1200 + (random() * 800)::int  
        WHEN city = 'Belo Horizonte' THEN 800 + (random() * 500)::int
        ELSE 500 + (random() * 300)::int
    END
WHERE base_daily_traffic IS NULL AND active = true;