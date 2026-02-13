-- JSON consolidado para o PDF
create or replace function public.proposal_summary(p_id bigint)
returns json language plpgsql security definer as $$
declare
  js json;
begin
  -- cabeçalho + agência/projeto
  with head as (
    select
      p.id, p.customer_name, p.customer_email,
      p.start_date, p.end_date,
      public.period_label(p.start_date, p.end_date) as period_label,
      p.cpm_mode, p.cpm_value,
      p.discount_pct, p.discount_fixed,
      ag.nome_agencia, ag.cnpj, ag.site,
      prj.nome_projeto, prj.cliente_final
    from public.proposals p
    left join public.agencias ag on ag.id = p.agencia_id
    left join public.agencia_projetos prj on prj.id = p.projeto_id
    where p.id = p_id
  ),
  base as (
    select *
    from public.v_proposal_items
    where proposal_id = p_id
  ),
  by_city as (
    select city, count(*) as qty
    from base
    group by city
    order by qty desc, city asc
  ),
  by_state as (
    select state, count(*) as qty
    from base
    group by state
    order by qty desc, state asc
  ),
  by_category as (
    select category, count(*) as qty
    from base
    group by category
    order by qty desc, category asc
  ),
  specs as (
    -- explode specialties (array) e dedup
    select array_agg(distinct trim(s)) filter (where s is not null and length(trim(s))>0) as specialties
    from (
      select unnest(b.specialties) as s
      from base b
    ) t
  )
  select json_build_object(
    'header', (select row_to_json(h) from head h),
    'city_summary', (select json_agg(row_to_json(c)) from by_city c),
    'state_summary', (select json_agg(row_to_json(s)) from by_state s),
    'category_summary', (select json_agg(row_to_json(k)) from by_category k),
    'specialties', coalesce((select specialties from specs), array[]::text[]),
    'totals', json_build_object(
        'screens', (select count(*) from base),
        'cities',  (select count(distinct city) from base),
        'states',  (select count(distinct state) from base),
        'categories', (select count(distinct category) from base)
    )
  )
  into js;

  return js;
end;
$$;
