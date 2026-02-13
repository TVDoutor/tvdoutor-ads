-- ===============================
-- FIX SPECIALTY DATA NORMALIZATION
-- Date: 2025-01-31
-- Corrigir dados de especialidades que estão como texto contínuo
-- ===============================

BEGIN;

-- 1. Criar função para normalizar especialidades médicas
CREATE OR REPLACE FUNCTION public.normalize_medical_specialties(specialty_text TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    medical_specialties TEXT[] := ARRAY[
        'OTORRINOLARINGOLOGIA', 'CIRURGIA GERAL', 'CLINICO GERAL', 'MEDICINA NUCLEAR', 
        'MEDICINA DO TRABALHO', 'MEDICINA ESPORTIVA', 'GASTROENTEROLOGIA', 
        'ENDOCRINOLOGIA', 'INFECTOLOGIA', 'OBSTETRICIA', 'REUMATOLOGIA', 
        'OFTALMOLOGIA', 'CARDIOLOGIA', 'DERMATOLOGIA', 'GINECOLOGIA', 
        'NEUROLOGIA', 'ORTOPEDIA', 'PEDIATRIA', 'ONCOLOGIA', 'TRANSPLANTE',
        'PSIQUIATRIA', 'UROLOGIA', 'ANESTESIOLOGIA', 'RADIOLOGIA', 'PATOLOGIA',
        'HEMATOLOGIA', 'NEFROLOGIA', 'PNEUMOLOGIA', 'GERIATRIA', 'UTI',
        'COLOPROCTOLOGIA', 'CIRURGIA PLASTICA', 'MASTOLOGIA', 'REABILITACAO',
        'NEONATOLOGIA', 'OBSTETRICIA', 'TRAUMATOLOGIA', 'PATOLOGIA'
    ];
    
    normalized_text TEXT;
    remaining_text TEXT;
    result_array TEXT[] := ARRAY[]::TEXT[];
    specialty TEXT;
    found_specialty TEXT;
    i INTEGER;
BEGIN
    -- Se o input é nulo ou vazio, retornar array vazio
    IF specialty_text IS NULL OR TRIM(specialty_text) = '' THEN
        RETURN ARRAY[]::TEXT[];
    END IF;
    
    -- Se já tem vírgulas, fazer split simples
    IF specialty_text LIKE '%,%' THEN
        SELECT ARRAY(
            SELECT TRIM(unnest(string_to_array(specialty_text, ',')))
        ) INTO result_array;
        RETURN result_array;
    END IF;
    
    -- Normalizar texto para maiúsculas
    normalized_text := UPPER(TRIM(specialty_text));
    remaining_text := normalized_text;
    
    -- Ordenar especialidades por tamanho (maiores primeiro)
    FOR i IN 1..array_length(medical_specialties, 1) LOOP
        specialty := medical_specialties[i];
        
        -- Verificar se a especialidade existe no texto
        IF remaining_text LIKE '%' || specialty || '%' THEN
            result_array := array_append(result_array, specialty);
            -- Remover a especialidade encontrada
            remaining_text := REPLACE(remaining_text, specialty, ' ');
            remaining_text := TRIM(regexp_replace(remaining_text, '\s+', ' ', 'g'));
        END IF;
    END LOOP;
    
    -- Se não encontrou nenhuma especialidade conhecida, retornar o texto original como array
    IF array_length(result_array, 1) IS NULL OR array_length(result_array, 1) = 0 THEN
        result_array := ARRAY[specialty_text];
    END IF;
    
    RETURN result_array;
END;
$$;

-- 2. Identificar registros com especialidades problemáticas
DO $$
DECLARE
    problematic_count INTEGER;
    total_count INTEGER;
BEGIN
    -- Contar total de registros
    SELECT COUNT(*) INTO total_count FROM public.screens;
    
    -- Contar registros com especialidades como texto contínuo (sem vírgulas mas com múltiplas palavras)
    SELECT COUNT(*) INTO problematic_count 
    FROM public.screens 
    WHERE specialty IS NOT NULL 
      AND array_length(specialty, 1) = 1 
      AND LENGTH(specialty[1]) > 50  -- Textos muito longos provavelmente são múltiplas especialidades
      AND specialty[1] NOT LIKE '%,%'; -- Não tem vírgulas
    
    RAISE NOTICE 'Total de telas: %', total_count;
    RAISE NOTICE 'Registros com especialidades problemáticas: %', problematic_count;
END $$;

-- 3. Atualizar registros com especialidades problemáticas
UPDATE public.screens 
SET specialty = public.normalize_medical_specialties(specialty[1])
WHERE specialty IS NOT NULL 
  AND array_length(specialty, 1) = 1 
  AND LENGTH(specialty[1]) > 50
  AND specialty[1] NOT LIKE '%,%';

-- 4. Verificar resultados da normalização
DO $$
DECLARE
    updated_count INTEGER;
    sample_record RECORD;
BEGIN
    -- Contar registros atualizados
    SELECT COUNT(*) INTO updated_count 
    FROM public.screens 
    WHERE specialty IS NOT NULL 
      AND array_length(specialty, 1) > 1;
    
    RAISE NOTICE 'Registros com especialidades normalizadas: %', updated_count;
    
    -- Mostrar alguns exemplos
    FOR sample_record IN 
        SELECT code, array_length(specialty, 1) as specialty_count, 
               array_to_string(specialty, ', ') as specialties_text
        FROM public.screens 
        WHERE specialty IS NOT NULL 
          AND array_length(specialty, 1) > 5
        LIMIT 3
    LOOP
        RAISE NOTICE 'Exemplo - Código: %, Especialidades (% total): %', 
                     sample_record.code, 
                     sample_record.specialty_count, 
                     LEFT(sample_record.specialties_text, 100);
    END LOOP;
END $$;

-- 5. Atualizar a view para garantir que staging_especialidades seja corretamente formatada
DROP VIEW IF EXISTS public.v_screens_enriched;

CREATE OR REPLACE VIEW public.v_screens_enriched AS
SELECT 
  sc.id,
  sc.code,
  sc.name,
  sc.display_name,
  sc.city,
  sc.state,
  sc.cep,
  -- Formatação melhorada do endereço
  CASE 
    WHEN sc.address_raw IS NOT NULL THEN sc.address_raw
    WHEN sc.city IS NOT NULL AND sc.state IS NOT NULL THEN 
      CONCAT(COALESCE(sc.address_raw, 'Endereço não informado'), ', ', sc.city, ' – ', sc.state)
    ELSE sc.address_raw
  END AS address,
  sc.lat,
  sc.lng,
  sc.geom,
  sc.active,
  COALESCE(sc.class::text, 'ND') AS class,
  -- Garantir que specialty seja sempre um array bem formatado
  COALESCE(sc.specialty, ARRAY[]::text[]) AS specialty,
  COALESCE(sc.board_format, 'LED') AS board_format,
  COALESCE(sc.category, 'Outdoor') AS category,
  
  -- Dados de taxas
  sr.standard_rate_month,
  sr.selling_rate_month,
  sr.spots_per_hour,
  sr.spot_duration_secs,
  
  -- Dados do venue (campos nulos por enquanto)
  NULL::text AS venue_name,
  NULL::text AS venue_address,
  NULL::text AS venue_country,
  NULL::text AS venue_state,
  NULL::text AS venue_district,
  
  -- Rede (TV Doutor, LG, Amil, etc.)
  CASE 
    WHEN sc.code LIKE 'P%' THEN 'TV Doutor'
    WHEN sc.code LIKE 'LG%' THEN 'LG'
    WHEN sc.code LIKE 'AM%' THEN 'Amil'
    ELSE 'TV Doutor'
  END AS rede,
  
  -- Campos de staging para compatibilidade
  sc.name AS staging_nome_ponto,
  NULL::integer AS staging_audiencia,
  -- Garantir que staging_especialidades seja uma string bem formatada
  CASE 
    WHEN sc.specialty IS NOT NULL AND array_length(sc.specialty, 1) > 0 
    THEN array_to_string(sc.specialty, ', ')
    ELSE NULL
  END AS staging_especialidades,
  NULL::text AS staging_tipo_venue,
  NULL::text AS staging_subtipo,
  sc.category AS staging_categoria,
  
  -- Timestamps
  sc.created_at,
  sc.updated_at

FROM public.screens AS sc
LEFT JOIN public.screen_rates AS sr ON sr.screen_id = sc.id

ORDER BY sc.code;

-- Comentário da view
COMMENT ON VIEW public.v_screens_enriched IS 'View enriquecida com especialidades normalizadas e bem formatadas';

-- Permitir acesso à view para usuários autenticados
GRANT SELECT ON public.v_screens_enriched TO authenticated;

-- 6. Log final
DO $$
DECLARE
    final_count INTEGER;
    avg_specialties NUMERIC;
BEGIN
    SELECT COUNT(*) INTO final_count 
    FROM public.screens 
    WHERE specialty IS NOT NULL AND array_length(specialty, 1) > 0;
    
    SELECT AVG(array_length(specialty, 1))::NUMERIC(5,2) INTO avg_specialties
    FROM public.screens 
    WHERE specialty IS NOT NULL AND array_length(specialty, 1) > 0;
    
    RAISE NOTICE '=== NORMALIZAÇÃO DE ESPECIALIDADES CONCLUÍDA ===';
    RAISE NOTICE 'Telas com especialidades: %', final_count;
    RAISE NOTICE 'Média de especialidades por tela: %', avg_specialties;
    RAISE NOTICE 'View v_screens_enriched atualizada com formatação melhorada';
END $$;

COMMIT;
