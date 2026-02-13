-- Fallback RLS: permite SELECT em tvd_player_status para anon.
-- Útil quando a requisição do frontend roda como anon (ex.: antes da sessão estar pronta).
-- Os dados são status de conexão/sync; risco baixo. Remova esta policy se quiser apenas authenticated.

DROP POLICY IF EXISTS "tvd_player_status_select_anon" ON public.tvd_player_status;
CREATE POLICY "tvd_player_status_select_anon"
  ON public.tvd_player_status
  FOR SELECT
  TO anon
  USING (true);

COMMENT ON POLICY "tvd_player_status_select_anon" ON public.tvd_player_status IS
  'Fallback: leitura via anon para evitar 403 no Inventário (Conexão TVD). Remover se preferir só authenticated.';
