-- Migration: Enhance agencia_projetos table with additional fields
-- Date: 2025-09-04
-- Description: Adds status, budget, responsible user, priority, project type, and audit fields to agencia_projetos

-- 1) Add new columns to agencia_projetos table
ALTER TABLE public.agencia_projetos 
  ADD COLUMN IF NOT EXISTS status_projeto text DEFAULT 'planejamento' CHECK (status_projeto IN ('planejamento', 'em_andamento', 'pausado', 'concluido', 'cancelado')),
  ADD COLUMN IF NOT EXISTS orcamento_projeto numeric(12,2),
  ADD COLUMN IF NOT EXISTS responsavel_projeto uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS prioridade text DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
  ADD COLUMN IF NOT EXISTS tipo_projeto text DEFAULT 'campanha' CHECK (tipo_projeto IN ('campanha', 'desenvolvimento', 'manutencao', 'consultoria', 'outros')),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2) Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3) Create trigger for updated_at
DROP TRIGGER IF EXISTS update_agencia_projetos_updated_at ON public.agencia_projetos;
CREATE TRIGGER update_agencia_projetos_updated_at
    BEFORE UPDATE ON public.agencia_projetos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Create function to set created_by on insert
CREATE OR REPLACE FUNCTION public.set_created_by_agencia_projetos()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5) Create trigger for created_by
DROP TRIGGER IF EXISTS set_created_by_agencia_projetos_trigger ON public.agencia_projetos;
CREATE TRIGGER set_created_by_agencia_projetos_trigger
    BEFORE INSERT ON public.agencia_projetos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_created_by_agencia_projetos();

-- 6) Create index for better performance
CREATE INDEX IF NOT EXISTS idx_agencia_projetos_status ON public.agencia_projetos(status_projeto);
CREATE INDEX IF NOT EXISTS idx_agencia_projetos_responsavel ON public.agencia_projetos(responsavel_projeto);
CREATE INDEX IF NOT EXISTS idx_agencia_projetos_tipo ON public.agencia_projetos(tipo_projeto);
CREATE INDEX IF NOT EXISTS idx_agencia_projetos_prioridade ON public.agencia_projetos(prioridade);
CREATE INDEX IF NOT EXISTS idx_agencia_projetos_created_by ON public.agencia_projetos(created_by);

-- 7) Update RLS policies to include new fields
-- Update the existing update policy to allow users to update their own projects
DROP POLICY IF EXISTS "agencia_projetos_update_admin" ON public.agencia_projetos;
CREATE POLICY "agencia_projetos_update_owner_or_admin"
ON public.agencia_projetos
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR public.is_super_admin())
WITH CHECK (created_by = auth.uid() OR public.is_super_admin());

-- 8) Create audit log table for project changes
CREATE TABLE IF NOT EXISTS public.agencia_projetos_audit (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    projeto_id uuid NOT NULL REFERENCES public.agencia_projetos(id) ON DELETE CASCADE,
    action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values jsonb,
    new_values jsonb,
    changed_by uuid REFERENCES auth.users(id),
    changed_at timestamptz DEFAULT now()
);

-- 9) Enable RLS on audit table
ALTER TABLE public.agencia_projetos_audit ENABLE ROW LEVEL SECURITY;

-- 10) Create RLS policies for audit table
CREATE POLICY "agencia_projetos_audit_select_auth"
ON public.agencia_projetos_audit
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "agencia_projetos_audit_insert_system"
ON public.agencia_projetos_audit
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 11) Create audit trigger function
CREATE OR REPLACE FUNCTION public.agencia_projetos_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.agencia_projetos_audit (
            projeto_id, action, old_values, changed_by
        ) VALUES (
            OLD.id, 'DELETE', to_jsonb(OLD), auth.uid()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.agencia_projetos_audit (
            projeto_id, action, old_values, new_values, changed_by
        ) VALUES (
            NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.agencia_projetos_audit (
            projeto_id, action, new_values, changed_by
        ) VALUES (
            NEW.id, 'INSERT', to_jsonb(NEW), auth.uid()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 12) Create audit triggers
DROP TRIGGER IF EXISTS agencia_projetos_audit_trigger ON public.agencia_projetos;
CREATE TRIGGER agencia_projetos_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.agencia_projetos
    FOR EACH ROW
    EXECUTE FUNCTION public.agencia_projetos_audit_trigger();

-- 13) Create view for project statistics
CREATE OR REPLACE VIEW public.agencia_projetos_stats AS
SELECT 
    ap.deal_id,
    ad.agencia_id,
    ag.nome_agencia,
    ad.nome_deal,
    COUNT(*) as total_projetos,
    COUNT(CASE WHEN ap.status_projeto = 'planejamento' THEN 1 END) as projetos_planejamento,
    COUNT(CASE WHEN ap.status_projeto = 'em_andamento' THEN 1 END) as projetos_em_andamento,
    COUNT(CASE WHEN ap.status_projeto = 'concluido' THEN 1 END) as projetos_concluidos,
    COUNT(CASE WHEN ap.status_projeto = 'cancelado' THEN 1 END) as projetos_cancelados,
    SUM(ap.orcamento_projeto) as orcamento_total,
    AVG(ap.orcamento_projeto) as orcamento_medio
FROM public.agencia_projetos ap
JOIN public.agencia_deals ad ON ap.deal_id = ad.id
JOIN public.agencias ag ON ad.agencia_id = ag.id
GROUP BY ap.deal_id, ad.agencia_id, ag.nome_agencia, ad.nome_deal;

-- 14) Grant permissions on the view
GRANT SELECT ON public.agencia_projetos_stats TO authenticated;

-- Comments about the implementation:
-- This migration enhances the agencia_projetos table with:
-- - Status tracking (planejamento, em_andamento, pausado, concluido, cancelado)
-- - Budget management with numeric precision
-- - User responsibility assignment
-- - Priority levels (baixa, media, alta, critica)
-- - Project type categorization
-- - Audit trail with full change history
-- - Performance indexes for common queries
-- - Statistics view for reporting
-- - Enhanced RLS policies for better security