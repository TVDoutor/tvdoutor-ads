-- Create proposal_kpis view for dashboard statistics
-- This view consolidates proposal data for easy querying

-- Remove any existing conflicting views first
DROP VIEW IF EXISTS public.proposal_kpis;
DROP VIEW IF EXISTS public.proposal_stats;
DROP VIEW IF EXISTS public.proposal_status_stats;

CREATE OR REPLACE VIEW public.proposal_kpis AS
SELECT
    p.id,
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
        WHEN p.cpm_mode = 'manual' THEN p.cpm_value
        ELSE COALESCE(p.cpm_value, 0) -- Fallback para 0 se não houver valor
    END as effective_cpm,
    
    -- Valor total da proposta (net_business como fallback)
    COALESCE(p.net_business, p.gross_business, 0) as total_value,
    
    -- Informações de criação
    p.created_by,
    p.created_at,
    
    -- Contagem de telas
    (SELECT COUNT(*) FROM public.proposal_screens ps WHERE ps.proposal_id = p.id) as total_screens,
    
    -- Status derivado baseado na data
    CASE 
        WHEN p.end_date < CURRENT_DATE THEN 'expired'
        WHEN p.start_date > CURRENT_DATE THEN 'future'
        WHEN p.status = 'aceita' THEN 'active'
        WHEN p.status = 'enviada' THEN 'active'
        WHEN p.status = 'em_analise' THEN 'active'
        ELSE 'draft'
    END as status
FROM public.proposals p;

-- Add comment for documentation
COMMENT ON VIEW public.proposal_kpis IS 'View consolidada para KPIs de propostas - usado pelo dashboard';

-- Grant access to authenticated users
GRANT SELECT ON public.proposal_kpis TO authenticated;

