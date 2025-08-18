-- SECURITY FIXES: Address privilege escalation and data exposure vulnerabilities (Fixed version)

-- 1. Create robust role model
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');

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

-- 7. Enable RLS on exposed tables and add proper policies
ALTER TABLE public.stg_billboard_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_billboard_enriched ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_audience_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_rules_dups_backup ENABLE ROW LEVEL SECURITY;

-- Only admins can access staging/backup tables
CREATE POLICY "Admin access only - stg_billboard_data"
    ON public.stg_billboard_data
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Admin access only - stg_billboard_enriched"
    ON public.stg_billboard_enriched
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Admin access only - stg_ponto"
    ON public.stg_ponto
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Admin access only - venue_audience_monthly"
    ON public.venue_audience_monthly
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Admin access only - price_rules_dups_backup"
    ON public.price_rules_dups_backup
    FOR ALL
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- 8. Update existing policies to use consistent role checking and require authentication

-- Fix profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Fix price_rules policies - remove duplicate and inconsistent policies
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

-- Fix screens policies - remove duplicate and inconsistent policies
DROP POLICY IF EXISTS "Authenticated can read screens" ON public.screens;
DROP POLICY IF EXISTS "screens.select.auth" ON public.screens;
DROP POLICY IF EXISTS "screens.write.admin" ON public.screens;
DROP POLICY IF EXISTS "screens_admin_write" ON public.screens;
DROP POLICY IF EXISTS "screens_read" ON public.screens;

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

-- Fix screen_rates policies - remove duplicate and inconsistent policies
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

-- Fix venues policies - remove duplicate and inconsistent policies
DROP POLICY IF EXISTS "venues.select.auth" ON public.venues;
DROP POLICY IF EXISTS "venues.write.admin" ON public.venues;

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

-- 9. Fix proposals policies - remove duplicate policies
DROP POLICY IF EXISTS "proposals_admin_delete" ON public.proposals;
DROP POLICY IF EXISTS "proposals_owner_insert" ON public.proposals;
DROP POLICY IF EXISTS "proposals_owner_read" ON public.proposals;
DROP POLICY IF EXISTS "proposals_owner_update" ON public.proposals;

CREATE POLICY "Only admins can delete proposals"
    ON public.proposals
    FOR DELETE
    TO authenticated
    USING (is_admin());

-- 10. Fix availability and bookings policies - remove duplicate policies
DROP POLICY IF EXISTS "availability_admin_delete" ON public.screen_availability;
DROP POLICY IF EXISTS "availability_insert" ON public.screen_availability;
DROP POLICY IF EXISTS "availability_read" ON public.screen_availability;
DROP POLICY IF EXISTS "availability_update" ON public.screen_availability;

DROP POLICY IF EXISTS "bookings_admin_delete" ON public.screen_bookings;
DROP POLICY IF EXISTS "bookings_insert" ON public.screen_bookings;
DROP POLICY IF EXISTS "bookings_read" ON public.screen_bookings;
DROP POLICY IF EXISTS "bookings_update" ON public.screen_bookings;

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