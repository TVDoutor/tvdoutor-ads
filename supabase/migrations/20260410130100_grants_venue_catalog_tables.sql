-- venue_restrictions / venue_networks had RLS but no table privileges for authenticated.
-- PostgREST returns 403 Forbidden without GRANT even when a permissive SELECT policy exists.

GRANT SELECT ON public.venue_restrictions TO authenticated;
GRANT SELECT ON public.venue_networks TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_restrictions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_networks TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE public.venue_restrictions_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.venue_networks_id_seq TO authenticated;
