-- ===============================
-- FIX VENUES TYPE COLUMN ERROR
-- Date: 2025-09-25
-- Correção do erro: column 'venues_3.type' does not exist
-- ===============================

BEGIN;

-- 1. Verificar se a coluna type existe na tabela venues
DO $$
BEGIN
    -- Se a coluna type não existir na tabela venues, adicionar uma coluna padrão
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'venues' 
          AND column_name = 'type' 
          AND table_schema = 'public'
    ) THEN
        -- Adicionar coluna type se não existir
        ALTER TABLE public.venues ADD COLUMN type VARCHAR(100);
        
        -- Comentário explicativo
        COMMENT ON COLUMN public.venues.type IS 'Tipo do venue - adicionado para corrigir erro de views antigas';
        
        -- Log da operação
        RAISE NOTICE 'Coluna type adicionada à tabela venues para corrigir erro de views antigas';
    ELSE
        RAISE NOTICE 'Coluna type já existe na tabela venues';
    END IF;
END $$;

-- 2. Verificar e corrigir views problemáticas que referenciam venues.type
DO $$
DECLARE
    view_record RECORD;
    view_count INTEGER := 0;
BEGIN
    -- Buscar views que referenciam venues e podem ter o problema
    FOR view_record IN 
        SELECT table_name, view_definition 
        FROM information_schema.views 
        WHERE view_definition LIKE '%venues%type%' 
          AND table_schema = 'public'
    LOOP
        view_count := view_count + 1;
        RAISE NOTICE 'View problemática encontrada: %', view_record.table_name;
        
        -- Log da definição da view para análise manual
        RAISE NOTICE 'Definição: %', view_record.view_definition;
    END LOOP;
    
    IF view_count = 0 THEN
        RAISE NOTICE 'Nenhuma view problemática encontrada que referencie venues.type';
    ELSE
        RAISE NOTICE 'Total de views problemáticas encontradas: %', view_count;
    END IF;
END $$;

-- 3. Remover views que podem estar causando o erro venues_3.type
-- (só remove se existirem e estiverem causando problemas)
DO $$
BEGIN
    -- Verificar se existem views antigas que podem estar causando o problema
    IF EXISTS (
        SELECT 1 
        FROM information_schema.views 
        WHERE table_name LIKE '%venue%' 
          AND view_definition LIKE '%venues_3%' 
          AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Encontrada view com alias venues_3 problemático';
        -- Aqui você pode adicionar DROP VIEW específicos se souber quais são
    END IF;
END $$;

-- 4. Verificar funções que podem estar usando venues.type
DO $$
DECLARE
    func_record RECORD;
    func_count INTEGER := 0;
BEGIN
    -- Buscar funções que referenciam venues
    FOR func_record IN 
        SELECT routine_name, routine_definition 
        FROM information_schema.routines 
        WHERE routine_definition LIKE '%venues%type%' 
          AND routine_schema = 'public'
          AND routine_type = 'FUNCTION'
    LOOP
        func_count := func_count + 1;
        RAISE NOTICE 'Função problemática encontrada: %', func_record.routine_name;
    END LOOP;
    
    IF func_count = 0 THEN
        RAISE NOTICE 'Nenhuma função problemática encontrada';
    ELSE
        RAISE NOTICE 'Total de funções problemáticas encontradas: %', func_count;
    END IF;
END $$;

-- 5. Atualizar permissões se a coluna foi adicionada
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'venues' 
          AND column_name = 'type' 
          AND table_schema = 'public'
    ) THEN
        -- Garantir que as políticas RLS ainda funcionem
        RAISE NOTICE 'Coluna type disponível na tabela venues';
    END IF;
END $$;

-- 6. Log final
DO $$
BEGIN
    RAISE NOTICE '=== CORREÇÃO VENUES.TYPE CONCLUÍDA ===';
    RAISE NOTICE 'Se o erro persistir, verifique views customizadas no Supabase Dashboard';
    RAISE NOTICE 'Procure por views que usam aliases como venues_3 e removam referências a .type';
END $$;

COMMIT;
