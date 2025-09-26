-- Tabela para snapshots imutáveis das propostas
create table if not exists public.proposal_snapshots (
  id bigserial primary key,
  proposal_id bigint not null references public.proposals(id) on delete cascade,
  snapshot_data jsonb not null,
  created_at timestamp with time zone default now() not null,
  created_by uuid references auth.users(id),
  snapshot_hash text not null, -- hash do conteúdo para detectar mudanças
  
  -- Índices para performance
  constraint unique_proposal_snapshot unique (proposal_id, snapshot_hash)
);

-- RLS (ajustar conforme suas políticas)
alter table public.proposal_snapshots enable row level security;

-- Função para criar snapshot imutável
create or replace function public.make_proposal_snapshot(p_id bigint)
returns jsonb
language plpgsql
security definer
as $$
declare
  snapshot_json jsonb;
  snapshot_hash_val text;
  existing_snapshot jsonb;
begin
  -- Construir o snapshot completo
  with header_data as (
    select jsonb_build_object(
      'id', p.id,
      'customer_name', p.customer_name,
      'customer_email', p.customer_email,
      'city', p.city,
      'created_at', p.created_at,
      'status', p.status,
      'discount_pct', p.discount_pct,
      'discount_fixed', p.discount_fixed,
      'cpm_mode', p.cpm_mode,
      'cpm_value', p.cpm_value,
      'insertions_per_hour', p.insertions_per_hour,
      'film_seconds', p.film_seconds,
      'start_date', p.start_date,
      'end_date', p.end_date,
      'nome_agencia', ag.nome_agencia,
      'nome_projeto', prj.nome_projeto,
      'cliente_final', prj.cliente_final
    ) as header
    from public.proposals p
    left join public.agencias ag on ag.id = p.agencia_id
    left join public.agencia_projetos prj on prj.id = p.projeto_id
    where p.id = p_id
  ),
  items_data as (
    select jsonb_agg(
      jsonb_build_object(
        'screen_id', screen_id,
        'code', screen_code,
        'screen_name', screen_name,
        'city', city,
        'state', state,
        'category', category,
        'specialties', specialties,
        'base_daily_traffic', base_daily_traffic,
        'custom_cpm', custom_cpm,
        'effective_cpm', effective_cpm,
        'screen_value', screen_value
      ) 
      order by city, screen_name
    ) as items
    from public.v_proposal_pdf
    where proposal_id = p_id
  )
  select jsonb_build_object(
    'header', h.header,
    'items', coalesce(i.items, '[]'::jsonb),
    'generated_at', now()
  )
  into snapshot_json
  from header_data h
  cross join items_data i;

  -- Calcular hash para detectar duplicatas
  snapshot_hash_val := encode(sha256(snapshot_json::text::bytea), 'hex');
  
  -- Verificar se já existe snapshot idêntico
  select snapshot_data 
  into existing_snapshot
  from public.proposal_snapshots 
  where proposal_id = p_id and snapshot_hash = snapshot_hash_val
  limit 1;
  
  -- Se não existe, criar novo snapshot
  if existing_snapshot is null then
    insert into public.proposal_snapshots (
      proposal_id, 
      snapshot_data, 
      snapshot_hash,
      created_by
    ) values (
      p_id,
      snapshot_json,
      snapshot_hash_val,
      auth.uid()
    );
  else
    -- Retornar snapshot existente
    snapshot_json := existing_snapshot;
  end if;
  
  return snapshot_json;
end;
$$;
