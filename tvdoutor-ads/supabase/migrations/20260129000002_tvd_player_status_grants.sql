-- Conceder SELECT em tvd_player_status para anon e authenticated.
-- Sem isso, "permission denied for table" (42501) mesmo com RLS permitindo as linhas.

GRANT SELECT ON public.tvd_player_status TO anon;
GRANT SELECT ON public.tvd_player_status TO authenticated;
