-- Retorna os farmacia_id que estão a até radius_km de algum venue.
-- Usado no mapa para mostrar somente farmácias no raio selecionado.
CREATE OR REPLACE FUNCTION public.get_farmacia_ids_in_radius(radius_km double precision)
RETURNS SETOF bigint
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT farmacia_id
  FROM public.mv_venue_farmacia_distancia
  WHERE distancia_km <= radius_km
  ORDER BY farmacia_id;
$$;

COMMENT ON FUNCTION public.get_farmacia_ids_in_radius(double precision) IS 'Lista de farmacia_id que estão a até radius_km de algum venue.';

GRANT EXECUTE ON FUNCTION public.get_farmacia_ids_in_radius(double precision) TO authenticated;
