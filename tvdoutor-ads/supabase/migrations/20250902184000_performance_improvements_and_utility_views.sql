-- ===============================
-- PERFORMANCE IMPROVEMENTS AND UTILITY VIEWS
-- Date: 2025-09-02
-- Incorpora os melhores elementos do db_patch_v2.sql mantendo nossa arquitetura de segurança
-- ===============================

BEGIN;

-- ===============================
-- 1. ÍNDICES DE PERFORMANCE
-- ===============================

-- Índices condicionais baseados na existência das tabelas
DO $$
BEGIN
    -- Índice para filtros por tipo de proposta (apenas se tabela existir)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_proposals_type ON public.proposals(proposal_type)';
    END IF;

    -- Índice para consultas de feriados por data (apenas se tabela existir)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'holidays' AND table_schema = 'public') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_holidays_day ON public.holidays(day)';
    END IF;

    -- Índices para performance do mapa e filtros geográficos (apenas se tabela existir)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens' AND table_schema = 'public') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_screens_geom_gist ON public.screens USING GIST(geom)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_screens_city_norm ON public.screens(city_norm)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_screens_state_norm ON public.screens(state_norm)';
    END IF;

    -- Índices para joins frequentes do sistema de propostas (apenas se tabelas existirem)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposal_screens' AND table_schema = 'public') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_proposal_screens_proposal_id ON public.proposal_screens(proposal_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_proposal_screens_screen_id ON public.proposal_screens(screen_id)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_audience_monthly' AND table_schema = 'public') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_venue_audience_monthly_venue_id ON public.venue_audience_monthly(venue_id)';
    END IF;
END $$;

-- Índices para performance de disponibilidade e bookings (se as tabelas existirem)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screen_availability' AND table_schema = 'public') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_screen_availability_period_gist ON public.screen_availability USING GIST(available_period)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_screen_availability_screen_id ON public.screen_availability(screen_id)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screen_bookings' AND table_schema = 'public') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_screen_bookings_period_gist ON public.screen_bookings USING GIST(booked_period)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_screen_bookings_screen_id ON public.screen_bookings(screen_id)';
    END IF;
END$$;

-- ===============================
-- 2. CONSTRAINTS DE INTEGRIDADE
-- ===============================

-- Índice UNIQUE para prevenir feriados duplicados
-- Importante: day + scope + state + city devem ser únicos
-- Usando expressão para tratar NULLs como strings vazias
CREATE UNIQUE INDEX IF NOT EXISTS ux_holidays_unique_entry 
ON public.holidays (day, scope, COALESCE(state, ''), COALESCE(city, ''));

-- ===============================
-- 3. VIEWS UTILITÁRIAS (condicionais)
-- ===============================

-- Views condicionais baseadas na existência das tabelas
DO $$
BEGIN
    -- View: Localidades (praças) de uma proposta (apenas se tabelas existirem)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposal_screens' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens' AND table_schema = 'public') THEN
        EXECUTE 'CREATE OR REPLACE VIEW public.proposal_locales AS
        SELECT DISTINCT
            ps.proposal_id,
            s.city,
            s.state,
            s.city_norm,
            s.state_norm,
            COUNT(ps.screen_id) OVER (PARTITION BY ps.proposal_id, s.city, s.state) as screens_count
        FROM public.proposal_screens ps
        JOIN public.screens s ON s.id = ps.screen_id
        ORDER BY ps.proposal_id, s.state, s.city';
    END IF;

    -- View: KPIs consolidados das propostas (apenas se tabelas existirem)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposal_screens' AND table_schema = 'public') THEN
        EXECUTE 'DROP VIEW IF EXISTS public.proposal_kpis';
        EXECUTE 'CREATE VIEW public.proposal_kpis AS
        SELECT
            p.id as proposal_id,
            p.proposal_type,
            p.start_date,
            p.end_date,
            p.cpm_mode,
            p.cpm_value,
            p.discount_pct,
            p.discount_fixed,
            
            -- Métricas temporais
            p.days_calendar,
            p.days_business,
            
            -- Métricas de impacto
            p.impacts_calendar,
            p.impacts_business,
            
            -- Métricas financeiras
            p.gross_calendar,
            p.gross_business,
            p.net_calendar,
            p.net_business,
            
            -- CPM efetivo calculado
            CASE 
                WHEN p.cpm_mode = ''manual'' THEN p.cpm_value
                ELSE public.resolve_effective_cpm(p.id)
            END as effective_cpm,
            
            -- Informações de criação
            p.created_by,
            
            -- Contagem de telas
            (SELECT COUNT(*) FROM public.proposal_screens ps WHERE ps.proposal_id = p.id) as total_screens,
            
            -- Status derivado
            CASE 
                WHEN p.end_date < CURRENT_DATE THEN ''expired''
                WHEN p.start_date > CURRENT_DATE THEN ''future''
                ELSE ''active''
            END as status
        FROM public.proposals p';

        -- View: Resumo de localidades por proposta (apenas se view base existir)
        IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'proposal_locales' AND schemaname = 'public') THEN
            EXECUTE 'CREATE OR REPLACE VIEW public.proposal_locations_summary AS
            SELECT 
                proposal_id,
                COUNT(DISTINCT state) as states_count,
                COUNT(DISTINCT city) as cities_count,
                SUM(screens_count) as total_screens,
                STRING_AGG(DISTINCT state, '', '' ORDER BY state) as states_list,
                STRING_AGG(DISTINCT city, '', '' ORDER BY city) as cities_list
            FROM public.proposal_locales
            GROUP BY proposal_id';
        END IF;
    END IF;
END $$;

-- ===============================
-- 4. FUNÇÕES UTILITÁRIAS ADICIONAIS (condicionais)
-- ===============================

-- Função para obter estatísticas rápidas de uma proposta (apenas se tabelas existirem)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposal_screens' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens' AND table_schema = 'public') THEN
        EXECUTE 'CREATE OR REPLACE FUNCTION public.get_proposal_stats(p_proposal_id bigint)
        RETURNS TABLE(
            screens_count bigint,
            cities_count bigint,
            states_count bigint,
            total_audience numeric,
            avg_cpm numeric,
            estimated_daily_impacts numeric
        )
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        SET search_path = public
        AS $func$
            SELECT 
                COUNT(ps.screen_id)::bigint as screens_count,
                COUNT(DISTINCT s.city)::bigint as cities_count,
                COUNT(DISTINCT s.state)::bigint as states_count,
                COALESCE(SUM(COALESCE(vam.audience, 0)), 0) as total_audience,
                AVG(COALESCE(ps.custom_cpm, sr.cpm, pr.cpm, 0)) as avg_cpm,
                COALESCE(SUM(COALESCE(ps.daily_traffic_override, vam.audience, 0)), 0) as estimated_daily_impacts
            FROM public.proposal_screens ps
            JOIN public.screens s ON s.id = ps.screen_id
            LEFT JOIN public.venue_audience_monthly vam ON vam.venue_id = s.venue_id
            LEFT JOIN public.screen_rates sr ON sr.screen_id = s.id
            LEFT JOIN public.price_rules pr ON pr.screen_id = s.id
            WHERE ps.proposal_id = p_proposal_id;
        $func$';
    END IF;
END $$;

-- ===============================
-- 5. COMENTÁRIOS DE DOCUMENTAÇÃO (condicionais)
-- ===============================

-- Comentários condicionais baseados na existência das views e funções
DO $$
BEGIN
    -- Comentários para views (apenas se existirem)
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'proposal_locales' AND schemaname = 'public') THEN
        EXECUTE 'COMMENT ON VIEW public.proposal_locales IS ''View que lista todas as localidades (cidades/estados) de uma proposta com contagem de telas''';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'proposal_kpis' AND schemaname = 'public') THEN
        EXECUTE 'COMMENT ON VIEW public.proposal_kpis IS ''View consolidada com todos os KPIs e métricas de propostas para uso em relatórios e frontend''';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'proposal_locations_summary' AND schemaname = 'public') THEN
        EXECUTE 'COMMENT ON VIEW public.proposal_locations_summary IS ''Resumo agregado das localidades por proposta para visão executiva''';
    END IF;
    
    -- Comentários para funções (apenas se existirem)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_proposal_stats' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        EXECUTE 'COMMENT ON FUNCTION public.get_proposal_stats(bigint) IS ''Função para obter estatísticas rápidas de uma proposta (telas, cidades, audiência, etc.)''';
    END IF;
    
    -- Comentários para índices (apenas se existirem)
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_holidays_day' AND relkind = 'i') THEN
        EXECUTE 'COMMENT ON INDEX idx_holidays_day IS ''Índice para otimizar consultas de feriados por data na função business_days_between''';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_proposals_type' AND relkind = 'i') THEN
        EXECUTE 'COMMENT ON INDEX idx_proposals_type IS ''Índice para otimizar filtros por tipo nas consultas de propostas''';
    END IF;
END $$;

COMMIT;
