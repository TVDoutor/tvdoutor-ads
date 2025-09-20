-- ===============================================
-- SCRIPT DE IMPORTAÇÃO EM MASSA DE TELAS
-- Versão melhorada com validações e logs
-- ===============================================

-- 1) Criar staging table temporária com validações
DROP TABLE IF EXISTS stg_upload_screens;
CREATE TEMP TABLE stg_upload_screens (
  code text NOT NULL,
  display_name text,
  address_raw text,
  city text,
  state text,
  class text,
  specialty text, -- array literal, ex: {"Cardio","Pediatria"}
  lat double precision,
  lng double precision,
  base_daily_traffic integer,
  category text,
  venue_type_parent text,
  venue_type_child text,
  venue_type_grandchildren text,
  active boolean DEFAULT true
);

-- 2) Upload do arquivo CSV (use a UI de "Upload file" do Supabase)
-- IMPORTANTE: O arquivo deve ter as colunas exatas da staging table
-- COPY stg_upload_screens FROM '/path/to/screens_import.csv' WITH (FORMAT csv, HEADER true);

-- 3) Validações pré-importação
DO $$
DECLARE
  invalid_codes INTEGER;
  invalid_classes INTEGER;
  invalid_coordinates INTEGER;
BEGIN
  -- Verificar códigos duplicados
  SELECT COUNT(*) INTO invalid_codes
  FROM (
    SELECT code, COUNT(*) as cnt
    FROM stg_upload_screens
    GROUP BY code
    HAVING COUNT(*) > 1
  ) dupes;
  
  IF invalid_codes > 0 THEN
    RAISE NOTICE 'AVISO: % códigos duplicados encontrados na staging table', invalid_codes;
  END IF;
  
  -- Verificar classes inválidas
  SELECT COUNT(*) INTO invalid_classes
  FROM stg_upload_screens s
  WHERE s.class IS NOT NULL 
    AND s.class NOT IN ('A', 'AB', 'ABC', 'B', 'BC', 'C', 'CD', 'D', 'E', 'ND');
  
  IF invalid_classes > 0 THEN
    RAISE NOTICE 'AVISO: % registros com classes inválidas encontrados', invalid_classes;
  END IF;
  
  -- Verificar coordenadas inválidas
  SELECT COUNT(*) INTO invalid_coordinates
  FROM stg_upload_screens
  WHERE (lat IS NOT NULL AND (lat < -90 OR lat > 90))
     OR (lng IS NOT NULL AND (lng < -180 OR lng > 180));
  
  IF invalid_coordinates > 0 THEN
    RAISE NOTICE 'AVISO: % registros com coordenadas inválidas encontrados', invalid_coordinates;
  END IF;
END $$;

-- 4) UPSERT nas tabelas reais com melhor tratamento de dados
WITH upserted AS (
  INSERT INTO public.screens
    (code, display_name, address_raw, city, state, class, specialty, lat, lng, 
     base_daily_traffic, category, venue_type_parent, venue_type_child, 
     venue_type_grandchildren, active, created_at, updated_at)
  SELECT
    s.code, 
    NULLIF(TRIM(s.display_name), '') as display_name,
    NULLIF(TRIM(s.address_raw), '') as address_raw,
    NULLIF(TRIM(s.city), '') as city,
    NULLIF(TRIM(s.state), '') as state,
    COALESCE(NULLIF(s.class,''),'ND')::class_band as class,
    CASE 
      WHEN s.specialty IS NULL OR TRIM(s.specialty) = '' THEN ARRAY[]::text[] 
      ELSE s.specialty::text[] 
    END as specialty,
    CASE 
      WHEN s.lat IS NOT NULL AND s.lat BETWEEN -90 AND 90 THEN s.lat 
      ELSE NULL 
    END as lat,
    CASE 
      WHEN s.lng IS NOT NULL AND s.lng BETWEEN -180 AND 180 THEN s.lng 
      ELSE NULL 
    END as lng,
    CASE 
      WHEN s.base_daily_traffic IS NOT NULL AND s.base_daily_traffic > 0 
      THEN s.base_daily_traffic 
      ELSE NULL 
    END as base_daily_traffic,
    NULLIF(TRIM(s.category), '') as category,
    NULLIF(TRIM(s.venue_type_parent), '') as venue_type_parent,
    NULLIF(TRIM(s.venue_type_child), '') as venue_type_child,
    NULLIF(TRIM(s.venue_type_grandchildren), '') as venue_type_grandchildren,
    COALESCE(s.active, true) as active,
    NOW() as created_at,
    NOW() as updated_at
  FROM stg_upload_screens s
  WHERE s.code IS NOT NULL AND TRIM(s.code) != ''
  ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    address_raw = EXCLUDED.address_raw,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    class = EXCLUDED.class,
    specialty = EXCLUDED.specialty,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    base_daily_traffic = EXCLUDED.base_daily_traffic,
    category = EXCLUDED.category,
    venue_type_parent = EXCLUDED.venue_type_parent,
    venue_type_child = EXCLUDED.venue_type_child,
    venue_type_grandchildren = EXCLUDED.venue_type_grandchildren,
    active = EXCLUDED.active,
    updated_at = NOW()
  RETURNING code, 
    CASE WHEN xmax = 0 THEN 'INSERTED' ELSE 'UPDATED' END as action
)
SELECT 
  COUNT(*) as total_processed,
  COUNT(*) FILTER (WHERE action = 'INSERTED') as inserted_count,
  COUNT(*) FILTER (WHERE action = 'UPDATED') as updated_count
FROM upserted;

-- 5) Atualizar geometria para registros com coordenadas válidas
UPDATE public.screens
SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE code IN (SELECT code FROM stg_upload_screens WHERE lat IS NOT NULL AND lng IS NOT NULL)
  AND lat BETWEEN -90 AND 90 
  AND lng BETWEEN -180 AND 180;

-- 6) Limpar geometria para registros com coordenadas inválidas
UPDATE public.screens
SET geom = NULL
WHERE code IN (SELECT code FROM stg_upload_screens WHERE lat IS NULL OR lng IS NULL);

-- 7) Estatísticas finais
DO $$
DECLARE
  total_screens INTEGER;
  active_screens INTEGER;
  screens_with_coords INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_screens FROM public.screens;
  SELECT COUNT(*) INTO active_screens FROM public.screens WHERE active = true;
  SELECT COUNT(*) INTO screens_with_coords FROM public.screens WHERE geom IS NOT NULL;
  
  RAISE NOTICE 'IMPORTAÇÃO CONCLUÍDA:';
  RAISE NOTICE '- Total de telas: %', total_screens;
  RAISE NOTICE '- Telas ativas: %', active_screens;
  RAISE NOTICE '- Telas com coordenadas: %', screens_with_coords;
END $$;

-- 8) Limpeza da staging table
DROP TABLE IF EXISTS stg_upload_screens;
