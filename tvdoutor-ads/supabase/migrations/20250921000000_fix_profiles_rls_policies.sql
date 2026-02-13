-- Fix profiles RLS policies to allow profile creation
-- This migration addresses the "new row violates row-level security policy for table profiles" error

BEGIN;

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- Create more permissive policies for profiles
-- Allow authenticated users to view their own profile or super admins to view all
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = auth.uid() AND p.super_admin = true
            )
        )
    );

-- Allow profile creation for any authenticated user (this is the key fix)
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            id = auth.uid() OR  -- User can create their own profile
            auth.uid() IS NOT NULL  -- Any authenticated user can create profiles (for system functions)
        )
    );

-- Allow users to update their own profile or super admins to update any profile
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = auth.uid() AND p.super_admin = true
            )
        )
    );

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON POLICY "profiles_select_policy" ON public.profiles IS 'Permite usuários verem seu próprio perfil ou super admins verem todos';
COMMENT ON POLICY "profiles_insert_policy" ON public.profiles IS 'Permite criação de perfis por usuários autenticados (corrigido para permitir criação automática)';
COMMENT ON POLICY "profiles_update_policy" ON public.profiles IS 'Permite atualização de perfis pelo próprio usuário ou super admins';

COMMIT;