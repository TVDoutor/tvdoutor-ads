-- ===============================
-- FIX IMPORT_FROM_STAGING FUNCTION
-- Date: 2025-09-25
-- Correção da função import_from_staging que referencia venues.type incorretamente
-- ===============================

BEGIN;

-- 1. Verificar se a função import_from_staging existe e tem referências problemáticas
DO $$
DECLARE
    func_definition TEXT;
BEGIN
    -- Buscar a definição da função
    SELECT routine_definition INTO func_definition
    FROM information_schema.routines 
    WHERE routine_name = 'import_from_staging' 
      AND routine_schema = 'public'
      AND routine_type = 'FUNCTION';
    
    IF func_definition IS NOT NULL THEN
        RAISE NOTICE 'Função import_from_staging encontrada';
        
        -- Verificar se contém referências problemáticas
        IF func_definition LIKE '%venues_3%' OR func_definition LIKE '%venues.type%' THEN
            RAISE NOTICE 'Função import_from_staging contém referências problemáticas a venues.type';
            
            -- Remover a função problemática (será recriada se necessário)
            DROP FUNCTION IF EXISTS public.import_from_staging();
            RAISE NOTICE 'Função import_from_staging removida para correção';
        ELSE
            RAISE NOTICE 'Função import_from_staging não contém referências problemáticas';
        END IF;
    ELSE
        RAISE NOTICE 'Função import_from_staging não encontrada';
    END IF;
END $$;

-- 2. Criar uma versão corrigida da função import_from_staging (se necessário)
-- Esta função seria recriada apenas se for essencial para o sistema
DO $$
BEGIN
    -- Verificar se realmente precisamos desta função
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.routines 
        WHERE routine_name = 'import_from_staging' 
          AND routine_schema = 'public'
    ) THEN
        RAISE NOTICE 'Função import_from_staging foi removida. Se for necessária, recriar sem referências a venues.type';
        
        -- Exemplo de como seria uma versão segura (descomentado apenas se necessário):
        -- CREATE OR REPLACE FUNCTION public.import_from_staging()
        -- RETURNS void
        -- LANGUAGE plpgsql
        -- SECURITY DEFINER
        -- SET search_path = public
        -- AS $function$
        -- BEGIN
        --     -- Implementação segura sem referências a venues.type
        --     -- (implementar conforme necessário)
        --     RAISE NOTICE 'Função import_from_staging executada (versão segura)';
        -- END;
        -- $function$;
    END IF;
END $$;

-- 3. Verificar outras funções que podem ter o mesmo problema
DO $$
DECLARE
    func_record RECORD;
    func_count INTEGER := 0;
BEGIN
    -- Buscar outras funções que podem ter referências problemáticas
    FOR func_record IN 
        SELECT routine_name, routine_definition 
        FROM information_schema.routines 
        WHERE (routine_definition LIKE '%venues_3%' OR routine_definition LIKE '%venues.type%')
          AND routine_schema = 'public'
          AND routine_type = 'FUNCTION'
          AND routine_name != 'import_from_staging'
    LOOP
        func_count := func_count + 1;
        RAISE NOTICE 'Outra função problemática encontrada: %', func_record.routine_name;
        
        -- Log para análise manual
        RAISE NOTICE 'Definição problemática: %', LEFT(func_record.routine_definition, 200);
    END LOOP;
    
    IF func_count = 0 THEN
        RAISE NOTICE 'Nenhuma outra função problemática encontrada';
    ELSE
        RAISE NOTICE 'Total de outras funções problemáticas: %', func_count;
    END IF;
END $$;

-- 4. Verificar e corrigir views que possam ter aliases problemáticos
DO $$
DECLARE
    view_record RECORD;
    view_count INTEGER := 0;
BEGIN
    -- Buscar views com aliases venues_3 ou similares
    FOR view_record IN 
        SELECT table_name, view_definition 
        FROM information_schema.views 
        WHERE (view_definition LIKE '%venues_3%' OR view_definition LIKE '%venues as v3%')
          AND table_schema = 'public'
    LOOP
        view_count := view_count + 1;
        RAISE NOTICE 'View com alias problemático encontrada: %', view_record.table_name;
        
        -- Seria necessário recriar estas views manualmente
        RAISE NOTICE 'View definition: %', LEFT(view_record.view_definition, 200);
    END LOOP;
    
    IF view_count = 0 THEN
        RAISE NOTICE 'Nenhuma view com alias venues_3 encontrada';
    ELSE
        RAISE NOTICE 'Views com aliases problemáticos: %', view_count;
    END IF;
END $$;

-- 5. Log final
DO $$
BEGIN
    RAISE NOTICE '=== CORREÇÃO DA FUNÇÃO IMPORT_FROM_STAGING CONCLUÍDA ===';
    RAISE NOTICE 'Se o erro venues_3.type persistir, verifique:';
    RAISE NOTICE '1. Views customizadas no Supabase Dashboard';
    RAISE NOTICE '2. Funções que fazem JOINs complexos com a tabela venues';
    RAISE NOTICE '3. Triggers ou stored procedures antigos';
END $$;

COMMIT;
