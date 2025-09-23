-- ===============================
-- FIX VIEW AND ADD MORE TEST DATA
-- Date: 2025-01-31
-- Corrigir view e adicionar mais dados de teste para verificar classes
-- ===============================

BEGIN;

-- Verificar se a view está funcionando corretamente
-- Recriar a view com debug adicional
DROP VIEW IF EXISTS public.v_screens_enriched;

CREATE OR REPLACE VIEW public.v_screens_enriched AS
SELECT
  -- Campos principais da tela
  sc.id,
  sc.code,
  sc.name,
  sc.display_name,
  sc.city,
  sc.state,
  sc.cep,
  sc.address_raw AS address,
  sc.lat,
  sc.lng,
  sc.geom,
  sc.active AS screen_active,
  sc.class,
  sc.specialty,
  sc.board_format,
  sc.category,
  
  -- Dados de rates (se existirem)
  sr.standard_rate_month,
  sr.selling_rate_month,
  sr.spots_per_hour,
  sr.spot_duration_secs,
  
  -- Dados do venue (se existir)
  v.name AS venue_name,
  v.google_formatted_address AS venue_address,
  v.country AS venue_country,
  v.state AS venue_state,
  v.district AS venue_district,
  
  -- Campo rede fixo baseado no código da tela
  CASE 
    WHEN sc.code LIKE 'P2%' THEN 'TV Doutor'
    WHEN sc.code LIKE 'P1%' THEN 'LG'
    WHEN sc.code LIKE 'P3%' THEN 'Amil'
    ELSE 'TV Doutor'
  END AS rede,
  
  -- Campos de staging para compatibilidade
  sc.name AS staging_nome_ponto,
  NULL::integer AS staging_audiencia,
  array_to_string(sc.specialty, ',') AS staging_especialidades,
  NULL::text AS staging_tipo_venue,
  NULL::text AS staging_subtipo,
  sc.category AS staging_categoria,
  
  -- Timestamps
  sc.created_at,
  sc.updated_at
  
FROM public.screens AS sc
LEFT JOIN public.screen_rates sr ON sr.screen_id = sc.id
LEFT JOIN public.venues v ON v.id = sc.venue_id
WHERE sc.active = true
ORDER BY sc.code;

-- Adicionar mais dados de teste com classes variadas
INSERT INTO public.screens (
    code, name, display_name, city, state, cep, address_raw, 
    lat, lng, class, specialty, active, board_format, category
) VALUES 
    -- Mais dados TV Doutor (P2%)
    ('P2003', 'TV Doutor Shopping Norte', 'TV Doutor Shopping Norte', 'São Paulo', 'SP', '02000-000', 'Av Paulista, 2000', 
     -23.5505, -46.6333, 'A', ARRAY['Shopping', 'Lazer'], true, 'LED', 'Shopping'),
    
    ('P2004', 'TV Doutor Metrô', 'TV Doutor Metrô', 'São Paulo', 'SP', '03000-000', 'Rua da Consolação, 500', 
     -23.5505, -46.6333, 'AB', ARRAY['Transporte', 'Mobilidade'], true, 'LCD', 'Metrô'),
    
    ('P2005', 'TV Doutor Aeroporto', 'TV Doutor Aeroporto', 'São Paulo', 'SP', '04000-000', 'Av das Nações Unidas, 1000', 
     -23.4356, -46.4731, 'B', ARRAY['Viagem', 'Turismo'], true, 'LED', 'Aeroporto'),
    
    -- Mais dados LG (P1%)
    ('P1003', 'LG Shopping Center', 'LG Shopping Center', 'São Paulo', 'SP', '05000-000', 'Rua Augusta, 1000', 
     -23.5615, -46.6565, 'C', ARRAY['Shopping', 'Comércio'], true, 'OLED', 'Shopping'),
    
    ('P1004', 'LG Hospital', 'LG Hospital', 'São Paulo', 'SP', '06000-000', 'Av Dr. Arnaldo, 500', 
     -23.5615, -46.6565, 'D', ARRAY['Saúde', 'Medicina'], true, 'LED', 'Hospital'),
    
    ('P1005', 'LG Universidade', 'LG Universidade', 'São Paulo', 'SP', '07000-000', 'Rua do Matão, 1000', 
     -23.5615, -46.6565, 'E', ARRAY['Educação', 'Ensino'], true, 'LCD', 'Universidade'),
    
    -- Mais dados Amil (P3%)
    ('P3002', 'Amil Shopping', 'Amil Shopping', 'Rio de Janeiro', 'RJ', '22000-001', 'Av das Américas, 1000', 
     -22.9712, -43.1822, 'BC', ARRAY['Shopping', 'Saúde'], true, 'LED', 'Shopping'),
    
    ('P3003', 'Amil Clínica', 'Amil Clínica', 'Rio de Janeiro', 'RJ', '22000-002', 'Rua Barata Ribeiro, 500', 
     -22.9712, -43.1822, 'CD', ARRAY['Saúde', 'Clínica'], true, 'OLED', 'Clínica')

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    display_name = EXCLUDED.display_name,
    class = EXCLUDED.class,
    specialty = EXCLUDED.specialty,
    active = EXCLUDED.active,
    board_format = EXCLUDED.board_format,
    category = EXCLUDED.category;

-- Atualizar algumas telas existentes para ter classes diferentes de 'ND'
UPDATE public.screens 
SET class = CASE 
    WHEN code = 'P2000' THEN 'A'
    WHEN code = 'P2000.1' THEN 'AB'
    WHEN code = 'P2000.11' THEN 'B'
    WHEN code = 'P1001' THEN 'BC'
    WHEN code = 'P3001' THEN 'C'
    ELSE class
END
WHERE code IN ('P2000', 'P2000.1', 'P2000.11', 'P1001', 'P3001');

COMMIT;
