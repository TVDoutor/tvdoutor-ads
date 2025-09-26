-- Semanal / Quinzenal / Mensal / Trimestral
create or replace function public.period_label(p_start date, p_end date)
returns text language sql immutable as $$
  with d as (
    select case
      when p_start is null or p_end is null then null
      else (p_end - p_start) end as days
  )
  select case
    when days is null then 'A definir'
    when days <= 7 then 'Semanal'
    when days <= 15 then 'Quinzenal'
    when days <= 31 then 'Mensal'
    when days <= 92 then 'Trimestral'
    else 'Personalizado'
  end from d;
$$;

-- remove nulos e array vazio
create or replace function public.array_distinct_nonempty(a text[])
returns text[] language sql immutable as $$
  select case when a is null then array[]::text[] 
              else (select coalesce(array_agg(distinct x) filter (where x is not null and length(trim(x))>0), array[]::text[])
                    from unnest(a) as x)
         end;
$$;
