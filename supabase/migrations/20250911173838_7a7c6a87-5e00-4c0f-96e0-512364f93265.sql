-- V2.0 Database Migration: Add DOOH Platform Enhancements

-- 1. Add new columns to screens table for audience and operational data
ALTER TABLE public.screens
ADD COLUMN IF NOT EXISTS base_daily_traffic INT COMMENT 'Estimativa de pessoas únicas que passam pelo ponto por dia. Fonte do "Alcance".';

ALTER TABLE public.screens  
ADD COLUMN IF NOT EXISTS spots_per_hour INT DEFAULT 6 COMMENT 'Número de inserções/spots que um anunciante recebe por hora.';

ALTER TABLE public.screens
ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{"start": "08:00", "end": "22:00"}'::jsonb COMMENT 'Horário de funcionamento da tela.';

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

-- 4. Create function for screen metrics calculation
CREATE OR REPLACE FUNCTION public.quote_screen_metrics(
    p_screen_id BIGINT, 
    p_start_date DATE, 
    p_duration_weeks INT
)
RETURNS TABLE (
    total_price NUMERIC, 
    total_exhibitions BIGINT,
    total_reach BIGINT, 
    total_frequency NUMERIC
) AS $$
DECLARE
    v_end_date DATE;
    v_total_days INT;
    v_daily_operating_hours INT;
    v_screen_data RECORD;
BEGIN
    -- Get screen data
    SELECT * INTO v_screen_data 
    FROM public.vw_screens_public 
    WHERE id = p_screen_id 
    LIMIT 1;
    
    IF NOT FOUND THEN 
        RETURN; 
    END IF;

    -- Calculate date range
    v_end_date := p_start_date + (p_duration_weeks * 7 || ' days')::interval;
    v_total_days := v_end_date - p_start_date;
    
    -- Extract operating hours (default to 14 hours if null)
    v_daily_operating_hours := COALESCE(
        EXTRACT(HOUR FROM (v_screen_data.operating_hours->>'end')::TIME) - 
        EXTRACT(HOUR FROM (v_screen_data.operating_hours->>'start')::TIME),
        14
    );

    -- Calculate metrics
    total_exhibitions := (COALESCE(v_screen_data.spots_per_hour, 6) * v_daily_operating_hours * v_total_days);
    total_reach := (COALESCE(v_screen_data.base_daily_traffic, 0) * v_total_days);

    IF total_reach > 0 THEN
        total_frequency := total_exhibitions::NUMERIC / total_reach::NUMERIC;
    ELSE
        total_frequency := 0;
    END IF;

    IF COALESCE(v_screen_data.base_monthly, 0) > 0 THEN
        total_price := (v_screen_data.base_monthly / 30.44) * v_total_days;
    ELSE
        total_price := 0;
    END IF;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Create function to refresh audience estimates
CREATE OR REPLACE FUNCTION public.refresh_audience_estimates()
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audience_estimates (city_norm, specialty, clinic_count, estimated_patients_monthly, last_updated_at)
    SELECT
        s.city_norm,
        unnest(s.specialty) AS specialty,
        COUNT(DISTINCT s.venue_id) AS clinic_count,
        (SUM(COALESCE(s.base_daily_traffic, 0)) * 30.44)::NUMERIC AS estimated_patients_monthly,
        NOW()
    FROM
        public.screens s
    WHERE
        s.active = TRUE 
        AND s.city_norm IS NOT NULL 
        AND s.specialty IS NOT NULL
        AND array_length(s.specialty, 1) > 0
    GROUP BY
        s.city_norm, unnest(s.specialty)
    ON CONFLICT (city_norm, specialty)
    DO UPDATE SET
        clinic_count = EXCLUDED.clinic_count,
        estimated_patients_monthly = EXCLUDED.estimated_patients_monthly,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add some sample data to base_daily_traffic for testing
UPDATE public.screens 
SET base_daily_traffic = 
    CASE 
        WHEN city = 'São Paulo' THEN 1500 + (random() * 1000)::int
        WHEN city = 'Rio de Janeiro' THEN 1200 + (random() * 800)::int  
        WHEN city = 'Belo Horizonte' THEN 800 + (random() * 500)::int
        ELSE 500 + (random() * 300)::int
    END
WHERE base_daily_traffic IS NULL AND active = true;

-- 7. Run initial refresh of audience estimates
SELECT public.refresh_audience_estimates();