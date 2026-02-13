-- ===============================
-- CREATE VIEW vw_screens_inventory
-- Date: 2025-01-31
-- View simplificada baseada apenas na tabela screens
-- ===============================

BEGIN;

-- Remover a view existente se houver
DROP VIEW IF EXISTS public.vw_screens_inventory;

-- Criar a view vw_screens_inventory simplificada
CREATE OR REPLACE VIEW public.vw_screens_inventory AS
SELECT
  -- Campos principais da tela
  sc.id,
  sc.code,
  sc.name,
  sc.city,
  sc.state,
  sc.cep,
  sc.address_raw AS address,
  sc.lat,
  sc.lng,
  sc.geom,
  sc.active,
  sc.class,
  sc.venue_type_parent,
  sc.venue_type_child,
  sc.venue_type_grandchildren,
  
  -- Dados de rates (se existirem)
  sr.standard_rate_month,
  sr.selling_rate_month,
  sr.spots_per_hour,
  sr.spot_duration_secs,
  
  -- Campos do staging simulados (usando dados da tabela screens)
  sc.name AS staging_nome_ponto,
  NULL::integer AS staging_audiencia,
  NULL::text AS staging_especialidades,
  sc.venue_type_parent AS staging_tipo_venue,
  sc.venue_type_child AS staging_subtipo,
  sc.venue_type_grandchildren AS staging_categoria
  
FROM public.screens AS sc
LEFT JOIN public.screen_rates sr ON sr.screen_id = sc.id
ORDER BY sc.code;

-- Comentário da view
COMMENT ON VIEW public.vw_screens_inventory IS 'View simplificada baseada na tabela screens para alimentar as telas de inventário, mapa interativo e pontos de vendas';

-- Permitir acesso à view para usuários autenticados
GRANT SELECT ON public.vw_screens_inventory TO authenticated;

COMMIT;
