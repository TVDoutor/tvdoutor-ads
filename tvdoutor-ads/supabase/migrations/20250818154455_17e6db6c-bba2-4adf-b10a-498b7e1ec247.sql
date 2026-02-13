-- SECURITY FIXES: Address privilege escalation and data exposure vulnerabilities (Fixed version)

-- 1. Create robust role model (apenas se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');
    END IF;
END $$;

-- Criar tabela user_roles apenas se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
        CREATE TABLE public.user_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            role app_role NOT NULL DEFAULT 'user',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            created_by UUID REFERENCES auth.users(id),
            UNIQUE (user_id, role)
        );
    END IF;
END $$;

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

-- 4. Migrate existing profile roles to user_roles table (only for valid users)
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    p.id,
    CASE 
        WHEN p.role = 'admin' THEN 'admin'::app_role
        WHEN p.role = 'user' THEN 'user'::app_role
        ELSE 'user'::app_role
    END,
    p.created_at
FROM public.profiles p
WHERE p.id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = p.id)
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

-- Create trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'prevent_profile_role_escalation'
    ) THEN
        CREATE TRIGGER prevent_profile_role_escalation
            BEFORE UPDATE ON public.profiles
            FOR EACH ROW
            EXECUTE FUNCTION public.prevent_role_escalation();
    END IF;
END $$;

-- 6. Fix RLS policies on user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Only super admins can manage roles" ON public.user_roles;
CREATE POLICY "Only super admins can manage roles"
    ON public.user_roles
    FOR ALL
    TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- 7. Enable RLS on exposed tables and add proper policies (only if they exist)
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

-- Only admins can access staging/backup tables (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_billboard_data' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Admin access only - stg_billboard_data" ON public.stg_billboard_data;
        CREATE POLICY "Admin access only - stg_billboard_data"
            ON public.stg_billboard_data
            FOR ALL
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_billboard_enriched' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Admin access only - stg_billboard_enriched" ON public.stg_billboard_enriched;
        CREATE POLICY "Admin access only - stg_billboard_enriched"
            ON public.stg_billboard_enriched
            FOR ALL
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stg_ponto' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Admin access only - stg_ponto" ON public.stg_ponto;
        CREATE POLICY "Admin access only - stg_ponto"
            ON public.stg_ponto
            FOR ALL
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venue_audience_monthly' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Admin access only - venue_audience_monthly" ON public.venue_audience_monthly;
        CREATE POLICY "Admin access only - venue_audience_monthly"
            ON public.venue_audience_monthly
            FOR ALL
            TO authenticated
            USING (is_admin())
            WITH CHECK (is_admin());
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_rules_dups_backup' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Admin access only - price_rules_dups_backup" ON public.price_rules_dups_backup;
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
DROP POLICY IF EXISTS "Only admins can modify screens" ON public.screens;

CREATE POLICY "Authenticated users can read screens"
    ON public.screens
    FOR SELECT
    TO authenticated
    USING (true);

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
        DROP POLICY IF EXISTS "Authenticated users can read screen_rates" ON public.screen_rates;
        DROP POLICY IF EXISTS "Only admins can modify screen_rates" ON public.screen_rates;

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

-- Create proposal policy only if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Only admins can delete proposals" ON public.proposals;
        CREATE POLICY "Only admins can delete proposals"
            ON public.proposals
            FOR DELETE
            TO authenticated
            USING (is_admin());
    END IF;
END $$;

-- 10. Fix availability and bookings policies - remove duplicate policies (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screen_availability' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "availability_admin_delete" ON public.screen_availability;
        DROP POLICY IF EXISTS "availability_insert" ON public.screen_availability;
        DROP POLICY IF EXISTS "availability_read" ON public.screen_availability;
        DROP POLICY IF EXISTS "availability_update" ON public.screen_availability;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screen_bookings' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "bookings_admin_delete" ON public.screen_bookings;
        DROP POLICY IF EXISTS "bookings_insert" ON public.screen_bookings;
        DROP POLICY IF EXISTS "bookings_read" ON public.screen_bookings;
        DROP POLICY IF EXISTS "bookings_update" ON public.screen_bookings;
    END IF;
END $$;

-- 11. Add function to safely get user role for frontend
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID DEFAULT auth.uid())
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role 
     FROM public.user_roles 
     WHERE user_id = _user_id 
     ORDER BY CASE 
       WHEN role = 'super_admin' THEN 1
       WHEN role = 'admin' THEN 2
       WHEN role = 'user' THEN 3
     END
     LIMIT 1),
    'user'::app_role
  )
$$;