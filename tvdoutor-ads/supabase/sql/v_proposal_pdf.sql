-- View otimizada para geração de PDF
create or replace view public.v_proposal_pdf as
select
  p.id as proposal_id,
  p.customer_name,
  p.customer_email,
  p.city as proposal_city,
  p.start_date,
  p.end_date,
  p.created_at,
  p.status,
  p.insertions_per_hour,
  p.film_seconds,
  p.cpm_mode,
  p.cpm_value,
  p.discount_pct,
  p.discount_fixed,
  p.agencia_id,
  p.projeto_id,
  
  -- Dados da agência e projeto
  ag.nome_agencia,
  ag.cnpj as agencia_cnpj,
  ag.site as agencia_site,
  prj.nome_projeto,
  prj.cliente_final,
  
  -- Dados das telas
  s.id as screen_id,
  s.code as screen_code,
  s.name as screen_name,
  coalesce(s.city, '') as city,
  coalesce(s.state, '') as state,
  s.category,
  s.specialty::text[] as specialties,
  s.base_daily_traffic,
  ps.custom_cpm,
  
  -- Cálculos por tela
  case 
    when ps.custom_cpm is not null then ps.custom_cpm
    when p.cpm_value is not null then p.cpm_value
    else 0
  end as effective_cpm,
  
  case 
    when s.base_daily_traffic is not null and (
      case 
        when ps.custom_cpm is not null then ps.custom_cpm
        when p.cpm_value is not null then p.cpm_value
        else 0
      end
    ) > 0 then 
      s.base_daily_traffic / 1000.0 * (
        case 
          when ps.custom_cpm is not null then ps.custom_cpm
          when p.cpm_value is not null then p.cpm_value
          else 0
        end
      )
    else 0
  end as screen_value
  
from public.proposals p
left join public.agencias ag on ag.id = p.agencia_id
left join public.agencia_projetos prj on prj.id = p.projeto_id
join public.proposal_screens ps on ps.proposal_id = p.id
join public.screens s on s.id = ps.screen_id;
