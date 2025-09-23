-- SECURITY FIXES: Address privilege escalation and data exposure vulnerabilities

-- 1. Create robust role model
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');
    END IF;
END $$;

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Create convenience functions for common role checks
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'super_admin')
$$;

-- 4. Migrate existing profile roles to user_roles table
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    id,
    CASE 
        WHEN role = 'admin' THEN 'admin'::app_role
        WHEN role = 'user' THEN 'user'::app_role
        ELSE 'user'::app_role
    END,
    created_at
FROM public.profiles
WHERE id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Create trigger to prevent profile role escalation
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow super_admin to change roles
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        IF NOT has_role(auth.uid(), 'super_admin') THEN
            RAISE EXCEPTION 'Only super administrators can change user roles';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_profile_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_escalation();

-- 6. Fix RLS policies on user_roles table
CREATE POLICY "Users can view their own roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Only super admins can manage roles"
    ON public.user_roles
    FOR ALL
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- 7. Enable RLS on exposed tables and add proper policies (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_billboard_data' AND table_schema = 'public') THEN
        ALTER TABLE public.stg_billboard_data ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_billboard_enriched' AND table_schema = 'public') THEN
        ALTER TABLE public.stg_billboard_enriched ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_ponto' AND table_schema = 'public') THEN
        ALTER TABLE public.stg_ponto ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_audience_monthly' AND table_schema = 'public') THEN
        ALTER TABLE public.venue_audience_monthly ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_rules_dups_backup' AND table_schema = 'public') THEN
        ALTER TABLE public.price_rules_dups_backup ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Only admins can access staging/backup tables (only create policies if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_billboard_data' AND table_schema = 'public') THEN
        CREATE POLICY "Admin access only - stg_billboard_data"
            ON public.stg_billboard_data
            FOR ALL
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_billboard_enriched' AND table_schema = 'public') THEN
        CREATE POLICY "Admin access only - stg_billboard_enriched"
            ON public.stg_billboard_enriched
            FOR ALL
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_ponto' AND table_schema = 'public') THEN
        CREATE POLICY "Admin access only - stg_ponto"
            ON public.stg_ponto
            FOR ALL
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_audience_monthly' AND table_schema = 'public') THEN
        CREATE POLICY "Admin access only - venue_audience_monthly"
            ON public.venue_audience_monthly
            FOR ALL
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_rules_dups_backup' AND table_schema = 'public') THEN
        CREATE POLICY "Admin access only - price_rules_dups_backup"
            ON public.price_rules_dups_backup
            FOR ALL
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());
    END IF;
END $$;

-- 8. Update existing policies to use consistent role checking and require authentication

-- Fix profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Fix price_rules policies - remove duplicate and inconsistent policies (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_rules' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Authenticated can read price_rules" ON public.price_rules;
        DROP POLICY IF EXISTS "price_rules.select.auth" ON public.price_rules;
        DROP POLICY IF EXISTS "price_rules.write.admin" ON public.price_rules;
        DROP POLICY IF EXISTS "price_rules_admin_write" ON public.price_rules;
        DROP POLICY IF EXISTS "price_rules_read" ON public.price_rules;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_rules' AND table_schema = 'public') THEN
        CREATE POLICY "Authenticated users can read price_rules"
            ON public.price_rules
            FOR SELECT
            TO authenticated
            USING (true);

        CREATE POLICY "Only admins can modify price_rules"
            ON public.price_rules
            FOR ALL
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());
    END IF;
END $$;

-- Fix screens policies - remove duplicate and inconsistent policies
DROP POLICY IF EXISTS "Authenticated can read screens" ON public.screens;
DROP POLICY IF EXISTS "screens.select.auth" ON public.screens;
DROP POLICY IF EXISTS "screens.write.admin" ON public.screens;
DROP POLICY IF EXISTS "screens_admin_write" ON public.screens;
DROP POLICY IF EXISTS "screens_read" ON public.screens;

DROP POLICY IF EXISTS "Authenticated users can read screens" ON public.screens;
CREATE POLICY "Authenticated users can read screens"
    ON public.screens
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Only admins can modify screens" ON public.screens;
CREATE POLICY "Only admins can modify screens"
    ON public.screens
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Fix screen_rates policies - remove duplicate and inconsistent policies (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screen_rates' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "screen_rates.select.auth" ON public.screen_rates;
        DROP POLICY IF EXISTS "screen_rates.write.admin" ON public.screen_rates;
        DROP POLICY IF EXISTS "screen_rates_admin_write" ON public.screen_rates;
        DROP POLICY IF EXISTS "screen_rates_read" ON public.screen_rates;

        CREATE POLICY "Authenticated users can read screen_rates"
            ON public.screen_rates
            FOR SELECT
            TO authenticated
            USING (true);

        CREATE POLICY "Only admins can modify screen_rates"
            ON public.screen_rates
            FOR ALL
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());
    END IF;
END $$;

-- Fix venues policies - remove duplicate and inconsistent policies
DROP POLICY IF EXISTS "venues.select.auth" ON public.venues;
DROP POLICY IF EXISTS "venues.write.admin" ON public.venues;
DROP POLICY IF EXISTS "Authenticated users can read venues" ON public.venues;
DROP POLICY IF EXISTS "Only admins can modify venues" ON public.venues;

CREATE POLICY "Authenticated users can read venues"
    ON public.venues
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can modify venues"
    ON public.venues
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- 9. Fix proposals policies - remove duplicate policies (apenas se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "proposals_admin_delete" ON public.proposals;
        DROP POLICY IF EXISTS "proposals_owner_insert" ON public.proposals;
        DROP POLICY IF EXISTS "proposals_owner_read" ON public.proposals;
        DROP POLICY IF EXISTS "proposals_owner_update" ON public.proposals;
    END IF;
END $$;

-- Keep the existing good policies that use functions
-- proposals.insert.owner, proposals.read.owner_or_admin, proposals.update.owner_or_admin are good

-- Criar política apenas se a tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        CREATE POLICY "Only admins can delete proposals"
            ON public.proposals
            FOR DELETE
            TO authenticated
            USING (is_admin());
    END IF;
END $$;

-- 10. Fix availability and bookings policies - remove duplicate policies (apenas se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screen_availability' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "availability_admin_delete" ON public.screen_availability;
        DROP POLICY IF EXISTS "availability_insert" ON public.screen_availability;
        DROP POLICY IF EXISTS "availability_read" ON public.screen_availability;
    END IF;
END $$;
-- Continuar com as outras políticas condicionalmente
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screen_availability' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "availability_update" ON public.screen_availability;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screen_bookings' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "bookings_admin_delete" ON public.screen_bookings;
        DROP POLICY IF EXISTS "bookings_insert" ON public.screen_bookings;
        DROP POLICY IF EXISTS "bookings_read" ON public.screen_bookings;
        DROP POLICY IF EXISTS "bookings_update" ON public.screen_bookings;
    END IF;
END $$;

-- Keep the existing user-specific policies for availability and bookings as they're properly scoped

-- 11. Add a super admin user (you'll need to change this UUID to your actual user ID)
-- This is commented out - you should run this manually with your actual user ID
-- INSERT INTO public.user_roles (user_id, role) 
-- VALUES ('your-user-uuid-here', 'super_admin') 
-- ON CONFLICT (user_id, role) DO NOTHING;

-- 12. Add function to safely get user role for frontend
-- Verificar se a função já existe e dropar se necessário
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_role') THEN
        DROP FUNCTION IF EXISTS public.get_user_role(uuid);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID DEFAULT auth.uid())
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE
    WHEN role = 'super_admin' THEN 1
    WHEN role = 'admin' THEN 2
    WHEN role = 'user' THEN 3
  END
  LIMIT 1
$$;