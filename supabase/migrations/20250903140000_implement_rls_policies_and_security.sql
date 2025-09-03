-- Migration: Implement RLS Policies and Security Enhancements
-- Date: 2025-09-03
-- Description: Adds is_super_admin function, enables RLS policies for agencias, agencia_deals, agencia_projetos, proposals, and implements automatic codigo_agencia generation

-- 1) Helper: checar super admin
create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select super_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- 2) Policies – public.agencias
-- Se o RLS estiver desativado, ative:
alter table public.agencias enable row level security;

-- SELECT: qualquer usuário autenticado
drop policy if exists "agencias_select_auth" on public.agencias;
create policy "agencias_select_auth"
on public.agencias
for select
to authenticated
using (true);

-- INSERT: qualquer usuário autenticado
drop policy if exists "agencias_insert_auth" on public.agencias;
create policy "agencias_insert_auth"
on public.agencias
for insert
to authenticated
with check (true);

-- UPDATE: apenas super admin
drop policy if exists "agencias_update_admin" on public.agencias;
create policy "agencias_update_admin"
on public.agencias
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- DELETE: apenas super admin
drop policy if exists "agencias_delete_admin" on public.agencias;
create policy "agencias_delete_admin"
on public.agencias
for delete
to authenticated
using (public.is_super_admin());

-- 3) Policies – public.agencia_deals
alter table public.agencia_deals enable row level security;

drop policy if exists "agencia_deals_select_auth" on public.agencia_deals;
create policy "agencia_deals_select_auth"
on public.agencia_deals
for select
to authenticated
using (true);

drop policy if exists "agencia_deals_insert_auth" on public.agencia_deals;
create policy "agencia_deals_insert_auth"
on public.agencia_deals
for insert
to authenticated
with check (true);

drop policy if exists "agencia_deals_update_admin" on public.agencia_deals;
create policy "agencia_deals_update_admin"
on public.agencia_deals
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "agencia_deals_delete_admin" on public.agencia_deals;
create policy "agencia_deals_delete_admin"
on public.agencia_deals
for delete
to authenticated
using (public.is_super_admin());

-- 4) Policies – public.agencia_projetos
alter table public.agencia_projetos enable row level security;

drop policy if exists "agencia_projetos_select_auth" on public.agencia_projetos;
create policy "agencia_projetos_select_auth"
on public.agencia_projetos
for select
to authenticated
using (true);

drop policy if exists "agencia_projetos_insert_auth" on public.agencia_projetos;
create policy "agencia_projetos_insert_auth"
on public.agencia_projetos
for insert
to authenticated
with check (true);

drop policy if exists "agencia_projetos_update_admin" on public.agencia_projetos;
create policy "agencia_projetos_update_admin"
on public.agencia_projetos
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "agencia_projetos_delete_admin" on public.agencia_projetos;
create policy "agencia_projetos_delete_admin"
on public.agencia_projetos
for delete
to authenticated
using (public.is_super_admin());

-- 5) Proposals: adicionar projeto_id + policies
-- Coluna e FK
alter table public.proposals
  add column if not exists projeto_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'proposals_projeto_id_fkey'
  ) then
    alter table public.proposals
      add constraint proposals_projeto_id_fkey
      foreign key (projeto_id)
      references public.agencia_projetos(id);
  end if;
end $$;

-- Ativar RLS (se preciso)
alter table public.proposals enable row level security;

-- SELECT: autenticado
drop policy if exists "proposals_select_auth" on public.proposals;
create policy "proposals_select_auth"
on public.proposals
for select
to authenticated
using (true);

-- INSERT: autenticado (usa created_by default auth.uid())
drop policy if exists "proposals_insert_auth" on public.proposals;
create policy "proposals_insert_auth"
on public.proposals
for insert
to authenticated
with check (true);

-- UPDATE: autor ou super admin
drop policy if exists "proposals_update_owner_or_admin" on public.proposals;
create policy "proposals_update_owner_or_admin"
on public.proposals
for update
to authenticated
using (created_by = auth.uid() or public.is_super_admin())
with check (created_by = auth.uid() or public.is_super_admin());

-- DELETE: super admin
drop policy if exists "proposals_delete_admin" on public.proposals;
create policy "proposals_delete_admin"
on public.proposals
for delete
to authenticated
using (public.is_super_admin());

-- 6) (Opcional) Gerar codigo_agencia = A000 automático
-- Se quiser que o código seja gerado ao inserir (e recuse formato errado ao editar manualmente):
create sequence if not exists agencias_codigo_seq start 1;

create or replace function public.gen_codigo_agencia()
returns trigger
language plpgsql
as $$
declare
  next_num int;
begin
  if new.codigo_agencia is null or new.codigo_agencia = '' then
    next_num := nextval('agencias_codigo_seq');
    new.codigo_agencia := 'A' || lpad(next_num::text, 3, '0');
  else
    if new.codigo_agencia !~ '^A[0-9]{3}$' then
      raise exception 'codigo_agencia deve seguir o padrão A000 (ex.: A200)';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gen_codigo_agencia on public.agencias;
create trigger trg_gen_codigo_agencia
before insert on public.agencias
for each row execute function public.gen_codigo_agencia();

-- checagem defensiva
do $$
begin
  begin
    alter table public.agencias
      add constraint agencias_codigo_agencia_format_chk
      check (codigo_agencia ~ '^A[0-9]{3}$');
  exception when duplicate_object then
    null;
  end;
end $$;

-- Comentários sobre a implementação:
-- Esta migração implementa um sistema de segurança robusto com RLS (Row Level Security)
-- que garante que apenas usuários autenticados possam ler dados, e apenas super admins
-- possam modificar registros críticos. O sistema também adiciona suporte para projetos
-- em propostas e geração automática de códigos de agência no padrão A000.