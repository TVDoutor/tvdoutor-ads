-- Fix agencia_projeto_marcos RLS policies to allow CRUD operations
-- This migration addresses the "permission denied for table agencia_projeto_marcos" error

BEGIN;

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "agencia_projeto_marcos_select_policy" ON public.agencia_projeto_marcos;
DROP POLICY IF EXISTS "agencia_projeto_marcos_insert_policy" ON public.agencia_projeto_marcos;
DROP POLICY IF EXISTS "agencia_projeto_marcos_update_policy" ON public.agencia_projeto_marcos;
DROP POLICY IF EXISTS "agencia_projeto_marcos_delete_policy" ON public.agencia_projeto_marcos;

-- Create simplified and more permissive policies

-- Allow authenticated users to view all marcos (simplified)
CREATE POLICY "marcos_select_policy" ON public.agencia_projeto_marcos
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

-- Allow authenticated users to create marcos (simplified)
CREATE POLICY "marcos_insert_policy" ON public.agencia_projeto_marcos
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            -- Super admin can create any marco
            is_super_admin() OR
            -- Project owner can create marcos
            EXISTS (
                SELECT 1 FROM public.agencia_projetos ap 
                WHERE ap.id = projeto_id AND ap.responsavel_projeto = auth.uid()
            ) OR
            -- Any authenticated user can create marcos (for now, to fix the immediate issue)
            auth.uid() IS NOT NULL
        )
    );

-- Allow authenticated users to update marcos they are responsible for or created
CREATE POLICY "marcos_update_policy" ON public.agencia_projeto_marcos
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            -- Super admin can update any marco
            is_super_admin() OR
            -- Responsible person can update
            responsavel_id = auth.uid() OR
            -- Creator can update
            created_by = auth.uid() OR
            -- Project owner can update
            EXISTS (
                SELECT 1 FROM public.agencia_projetos ap 
                WHERE ap.id = projeto_id AND ap.responsavel_projeto = auth.uid()
            )
        )
    );

-- Allow authenticated users to delete marcos they are responsible for or created
CREATE POLICY "marcos_delete_policy" ON public.agencia_projeto_marcos
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND (
            -- Super admin can delete any marco
            is_super_admin() OR
            -- Responsible person can delete
            responsavel_id = auth.uid() OR
            -- Creator can delete
            created_by = auth.uid() OR
            -- Project owner can delete
            EXISTS (
                SELECT 1 FROM public.agencia_projetos ap 
                WHERE ap.id = projeto_id AND ap.responsavel_projeto = auth.uid()
            )
        )
    );

-- Ensure RLS is enabled
ALTER TABLE public.agencia_projeto_marcos ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON POLICY "marcos_select_policy" ON public.agencia_projeto_marcos IS 'Permite usuários autenticados visualizarem marcos';
COMMENT ON POLICY "marcos_insert_policy" ON public.agencia_projeto_marcos IS 'Permite criação de marcos por usuários autenticados (simplificado)';
COMMENT ON POLICY "marcos_update_policy" ON public.agencia_projeto_marcos IS 'Permite atualização de marcos pelo responsável, criador ou dono do projeto';
COMMENT ON POLICY "marcos_delete_policy" ON public.agencia_projeto_marcos IS 'Permite exclusão de marcos pelo responsável, criador ou dono do projeto';

COMMIT;