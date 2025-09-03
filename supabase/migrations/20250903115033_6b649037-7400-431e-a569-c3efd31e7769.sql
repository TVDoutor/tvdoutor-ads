
-- 1) Garantir enum class_band com os valores desejados
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'class_band') THEN
    CREATE TYPE public.class_band AS ENUM ('A','AB','ABC','B','BC','C','CD','D','E','ND');
  END IF;
END$$;

-- Adicionar valores que possam faltar (idempotente)
DO $$
DECLARE v text;
BEGIN
  FOREACH v IN ARRAY ARRAY['A','AB','ABC','B','BC','C','CD','D','E','ND']
  LOOP
    BEGIN
      EXECUTE format('ALTER TYPE public.class_band ADD VALUE IF NOT EXISTS %L', v);
    EXCEPTION WHEN others THEN
      -- ignora erros de ordem/duplicidade (enum já tem o valor)
      NULL;
    END;
  END LOOP;
END$$;

-- Índice auxiliar para classe
CREATE INDEX IF NOT EXISTS screens_class_idx ON public.screens(class);

-- 2) Padronizar status de propostas com enum proposal_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proposal_status') THEN
    CREATE TYPE public.proposal_status AS ENUM ('rascunho','enviada','em_analise','aceita','rejeitada');
  END IF;
END$$;

-- Migrar valores antigos comuns para novos
UPDATE public.proposals
SET status = CASE lower(coalesce(status,'')) 
  WHEN 'draft'     THEN 'rascunho'
  WHEN 'sent'      THEN 'enviada'
  WHEN 'accepted'  THEN 'aceita'
  WHEN 'rejected'  THEN 'rejeitada'
  WHEN ''          THEN 'rascunho'
  ELSE status
END;

-- Corrigir valores inválidos para 'rascunho'
UPDATE public.proposals
SET status = 'rascunho'
WHERE status NOT IN ('rascunho','enviada','em_analise','aceita','rejeitada');

-- Alterar coluna para enum (se ainda não for)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='proposals' AND column_name='status'
      AND udt_name <> 'proposal_status'
  ) THEN
    ALTER TABLE public.proposals
      ALTER COLUMN status DROP DEFAULT;

    ALTER TABLE public.proposals
      ALTER COLUMN status TYPE public.proposal_status
      USING CASE 
        WHEN status IN ('rascunho','enviada','em_analise','aceita','rejeitada')
          THEN status::public.proposal_status
        ELSE 'rascunho'::public.proposal_status
      END;

    ALTER TABLE public.proposals
      ALTER COLUMN status SET DEFAULT 'rascunho'::public.proposal_status;
  END IF;
END$$;

-- Garantir coluna status tem default correto (caso já fosse enum)
ALTER TABLE public.proposals
  ALTER COLUMN status SET DEFAULT 'rascunho'::public.proposal_status;

-- 3) View de estatísticas de e-mail (substitui a tabela se existir)
DROP VIEW IF EXISTS public.email_stats;
DROP TABLE IF EXISTS public.email_stats;

CREATE OR REPLACE VIEW public.email_stats AS
SELECT
  el.email_type::text AS email_type,
  el.status::text     AS status,
  COUNT(*)::bigint    AS total,
  COUNT(*) FILTER (WHERE coalesce(el.sent_at, el.created_at) >= now() - interval '1 day')::bigint AS today,
  COUNT(*) FILTER (WHERE coalesce(el.sent_at, el.created_at) >= now() - interval '7 day')::bigint AS last_7_days
FROM public.email_logs el
GROUP BY el.email_type, el.status
ORDER BY email_type, status;

-- 4) Gatilho de atualização do timestamp de status (reforçar)
CREATE OR REPLACE FUNCTION public.update_proposal_status_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_updated_at = now();
  END IF;
  RETURN NEW;
END
$fn$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_proposals_status_timestamp'
      AND tgrelid = 'public.proposals'::regclass
  ) THEN
    CREATE TRIGGER trg_proposals_status_timestamp
    BEFORE UPDATE ON public.proposals
    FOR EACH ROW EXECUTE FUNCTION public.update_proposal_status_timestamp();
  END IF;
END$$;

