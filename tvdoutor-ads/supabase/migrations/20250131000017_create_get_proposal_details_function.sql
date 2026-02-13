-- Função SQL para retornar dados completos da proposta para geração de PDF
-- Baseada na especificação fornecida pelo usuário

CREATE OR REPLACE FUNCTION get_proposal_details(p_proposal_id INT)
RETURNS JSONB AS $$
DECLARE
    proposal_data RECORD;
    inventario_summary JSONB;
    cidade_summary JSONB;
BEGIN
    -- 1. Pega os dados principais da proposta
    SELECT
        p.id,
        p.customer_name as name,
        p.status,
        p.customer_name as client_name,
        COALESCE(a.nome_agencia, 'Agência não definida') as agency_name,
        COALESCE(p.net_calendar, 0) as total_value,
        CASE 
            WHEN p.start_date IS NOT NULL AND p.end_date IS NOT NULL THEN
                EXTRACT(DAY FROM (p.end_date::date - p.start_date::date)) + 1
            ELSE 30
        END as period_months,
        -- Correção do valor mensal
        CASE 
            WHEN p.start_date IS NOT NULL AND p.end_date IS NOT NULL THEN
                COALESCE(p.net_calendar, 0) / NULLIF(EXTRACT(DAY FROM (p.end_date::date - p.start_date::date)) + 1, 0)
            ELSE COALESCE(p.net_calendar, 0) / 30
        END as monthly_investment,
        -- Correção da contagem de telas
        (SELECT COUNT(*) FROM proposal_screens pi WHERE pi.proposal_id = p.id) as screens_count
    INTO proposal_data
    FROM proposals p
    LEFT JOIN agencias a ON p.agencia_id = a.id
    WHERE p.id = p_proposal_id;

    -- 2. Agrega os dados do inventário (locais, cidades, etc.)
    SELECT jsonb_agg(
        jsonb_build_object(
            'city', s.city,
            'state', s.state,
            'screens_in_city', COUNT(s.id)
        )
    )
    INTO cidade_summary
    FROM proposal_screens pi
    JOIN screens s ON pi.screen_id = s.id
    WHERE pi.proposal_id = p_proposal_id
    GROUP BY s.city, s.state;

    -- 3. Monta o JSON final de retorno
    RETURN jsonb_build_object(
        'proposal', to_jsonb(proposal_data),
        'inventory_summary_by_city', COALESCE(cidade_summary, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql;

-- Comentário de exemplo de uso
-- SELECT get_proposal_details(36);
