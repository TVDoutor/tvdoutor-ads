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

-- 2) Policies – public.agencias - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencias' AND table_schema = 'public') THEN
        -- Se o RLS estiver desativado, ative:
        ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;

        -- SELECT: qualquer usuário autenticado
        DROP POLICY IF EXISTS "agencias_select_auth" ON public.agencias;
        CREATE POLICY "agencias_select_auth"
        ON public.agencias
        FOR SELECT
        TO authenticated
        USING (true);

        -- INSERT: qualquer usuário autenticado
        DROP POLICY IF EXISTS "agencias_insert_auth" ON public.agencias;
        CREATE POLICY "agencias_insert_auth"
        ON public.agencias
        FOR INSERT
        TO authenticated
        WITH CHECK (true);

        -- UPDATE: apenas super admin
        DROP POLICY IF EXISTS "agencias_update_admin" ON public.agencias;
        CREATE POLICY "agencias_update_admin"
        ON public.agencias
        FOR UPDATE
        TO authenticated
        USING (public.is_super_admin())
        WITH CHECK (public.is_super_admin());

        -- DELETE: apenas super admin
        DROP POLICY IF EXISTS "agencias_delete_admin" ON public.agencias;
        CREATE POLICY "agencias_delete_admin"
        ON public.agencias
        FOR DELETE
        TO authenticated
        USING (public.is_super_admin());
    END IF;
END $$;

-- 3) Policies – public.agencia_deals - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_deals' AND table_schema = 'public') THEN
        ALTER TABLE public.agencia_deals ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "agencia_deals_select_auth" ON public.agencia_deals;
        CREATE POLICY "agencia_deals_select_auth"
        ON public.agencia_deals
        FOR SELECT
        TO authenticated
        USING (true);

        DROP POLICY IF EXISTS "agencia_deals_insert_auth" ON public.agencia_deals;
        CREATE POLICY "agencia_deals_insert_auth"
        ON public.agencia_deals
        FOR INSERT
        TO authenticated
        WITH CHECK (true);

        DROP POLICY IF EXISTS "agencia_deals_update_admin" ON public.agencia_deals;
        CREATE POLICY "agencia_deals_update_admin"
        ON public.agencia_deals
        FOR UPDATE
        TO authenticated
        USING (public.is_super_admin())
        WITH CHECK (public.is_super_admin());

        DROP POLICY IF EXISTS "agencia_deals_delete_admin" ON public.agencia_deals;
        CREATE POLICY "agencia_deals_delete_admin"
        ON public.agencia_deals
        FOR DELETE
        TO authenticated
        USING (public.is_super_admin());
    END IF;
END $$;

-- 4) Policies – public.agencia_projetos - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencia_projetos' AND table_schema = 'public') THEN
        ALTER TABLE public.agencia_projetos ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "agencia_projetos_select_auth" ON public.agencia_projetos;
        CREATE POLICY "agencia_projetos_select_auth"
        ON public.agencia_projetos
        FOR SELECT
        TO authenticated
        USING (true);

        DROP POLICY IF EXISTS "agencia_projetos_insert_auth" ON public.agencia_projetos;
        CREATE POLICY "agencia_projetos_insert_auth"
        ON public.agencia_projetos
        FOR INSERT
        TO authenticated
        WITH CHECK (true);

        DROP POLICY IF EXISTS "agencia_projetos_update_admin" ON public.agencia_projetos;
        CREATE POLICY "agencia_projetos_update_admin"
        ON public.agencia_projetos
        FOR UPDATE
        TO authenticated
        USING (public.is_super_admin())
        WITH CHECK (public.is_super_admin());

        DROP POLICY IF EXISTS "agencia_projetos_delete_admin" ON public.agencia_projetos;
        CREATE POLICY "agencia_projetos_delete_admin"
        ON public.agencia_projetos
        FOR DELETE
        TO authenticated
        USING (public.is_super_admin());
    END IF;
END $$;

-- 5) Proposals: adicionar projeto_id + policies - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        -- Coluna e FK
        ALTER TABLE public.proposals
          ADD COLUMN IF NOT EXISTS projeto_id uuid;

        -- Adicionar FK se não existir
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'proposals_projeto_id_fkey'
        ) THEN
            ALTER TABLE public.proposals
              ADD CONSTRAINT proposals_projeto_id_fkey
              FOREIGN KEY (projeto_id)
              REFERENCES public.agencia_projetos(id);
        END IF;

        -- Ativar RLS (se preciso)
        ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

        -- SELECT: autenticado
        DROP POLICY IF EXISTS "proposals_select_auth" ON public.proposals;
        CREATE POLICY "proposals_select_auth"
        ON public.proposals
        FOR SELECT
        TO authenticated
        USING (true);

        -- INSERT: autenticado (usa created_by default auth.uid())
        DROP POLICY IF EXISTS "proposals_insert_auth" ON public.proposals;
        CREATE POLICY "proposals_insert_auth"
        ON public.proposals
        FOR INSERT
        TO authenticated
        WITH CHECK (true);

        -- UPDATE: autor ou super admin
        DROP POLICY IF EXISTS "proposals_update_owner_or_admin" ON public.proposals;
        CREATE POLICY "proposals_update_owner_or_admin"
        ON public.proposals
        FOR UPDATE
        TO authenticated
        USING (created_by = auth.uid() OR public.is_super_admin())
        WITH CHECK (created_by = auth.uid() OR public.is_super_admin());

        -- DELETE: super admin
        DROP POLICY IF EXISTS "proposals_delete_admin" ON public.proposals;
        CREATE POLICY "proposals_delete_admin"
        ON public.proposals
        FOR DELETE
        TO authenticated
        USING (public.is_super_admin());
    END IF;
END $$;

-- 6) (Opcional) Gerar codigo_agencia = A000 automático - apenas se tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencias' AND table_schema = 'public') THEN
        -- Se quiser que o código seja gerado ao inserir (e recuse formato errado ao editar manualmente):
        CREATE SEQUENCE IF NOT EXISTS agencias_codigo_seq START 1;

        CREATE OR REPLACE FUNCTION public.gen_codigo_agencia()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $func$
        DECLARE
          next_num int;
        BEGIN
          IF NEW.codigo_agencia IS NULL OR NEW.codigo_agencia = '' THEN
            next_num := nextval('agencias_codigo_seq');
            NEW.codigo_agencia := 'A' || lpad(next_num::text, 3, '0');
          ELSE
            IF NEW.codigo_agencia !~ '^A[0-9]{3}$' THEN
              RAISE EXCEPTION 'codigo_agencia deve seguir o padrão A000 (ex.: A200)';
            END IF;
          END IF;
          RETURN NEW;
        END;
        $func$;

        DROP TRIGGER IF EXISTS trg_gen_codigo_agencia ON public.agencias;
        CREATE TRIGGER trg_gen_codigo_agencia
        BEFORE INSERT ON public.agencias
        FOR EACH ROW EXECUTE FUNCTION public.gen_codigo_agencia();

        -- checagem defensiva
        BEGIN
            ALTER TABLE public.agencias
              ADD CONSTRAINT agencias_codigo_agencia_format_chk
              CHECK (codigo_agencia ~ '^A[0-9]{3}$');
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;

-- Comentários sobre a implementação:
-- Esta migração implementa um sistema de segurança robusto com RLS (Row Level Security)
-- que garante que apenas usuários autenticados possam ler dados, e apenas super admins
-- possam modificar registros críticos. O sistema também adiciona suporte para projetos
-- em propostas e geração automática de códigos de agência no padrão A000.