-- RLS para tvd_player_status: leitura por usuários autenticados
-- Necessário para Dashboard (alertas offline > 24h) e Inventário (status por venue_code).

ALTER TABLE public.tvd_player_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tvd_player_status_select_authenticated" ON public.tvd_player_status;
CREATE POLICY "tvd_player_status_select_authenticated"
  ON public.tvd_player_status
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY "tvd_player_status_select_authenticated" ON public.tvd_player_status IS
  'Permite leitura do cache de status dos players (GraphQL sync) para alertas e inventário.';
