/**
 * Serviço para filtros e relatórios por "raio de farmácia" e "farmácias por especialidade".
 * Depende das RPCs e da view mv_venue_farmacia_distancia no Supabase.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Retorna os venue_id que possuem pelo menos uma farmácia a até radiusKm.
 * Uso: filtrar telas no mapa, na nova proposta e no relatório.
 */
export async function getVenueIdsWithPharmacyInRadius(radiusKm: number): Promise<number[]> {
  const { data, error } = await supabase.rpc('get_venue_ids_with_pharmacy_in_radius', {
    radius_km: radiusKm
  });
  if (error) throw error;
  const ids = (data ?? []) as (number | string)[];
  return ids.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
}

/**
 * Retorna os venue_id que possuem pelo menos uma das farmácias informadas.
 * @param farmaciaIds - IDs das farmácias
 * @param radiusKm - Se informado, restringe a distância máxima (ex.: 1 km). Senão usa o limite da view (30 km).
 * Uso: filtrar telas no mapa quando o usuário aplica filtros de farmácia (grupo, cidade, etc.) e opcionalmente raio.
 */
export async function getVenueIdsForFarmaciaIds(farmaciaIds: number[], radiusKm?: number): Promise<number[]> {
  if (!farmaciaIds.length) return [];
  let query = supabase
    .from('mv_venue_farmacia_distancia')
    .select('venue_id')
    .in('farmacia_id', farmaciaIds);
  if (radiusKm != null && radiusKm > 0) {
    query = query.lte('distancia_km', radiusKm);
  }
  const { data, error } = await query;
  if (error) throw error;
  const ids = [...new Set((data ?? []).map((r: { venue_id: number }) => r.venue_id))];
  return ids;
}

/**
 * Retorna os farmacia_id que estão a até radiusKm de algum venue.
 * Uso: no mapa, mostrar somente farmácias no raio selecionado (mesma lógica das telas).
 */
export async function getFarmaciaIdsInRadius(radiusKm: number): Promise<number[]> {
  const { data, error } = await supabase.rpc('get_farmacia_ids_in_radius', {
    radius_km: radiusKm
  });
  if (error) throw error;
  const ids = (data ?? []) as (number | string)[];
  return ids.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
}

export interface PharmacyCountBySpecialtyResult {
  specialty: string;
  radius_km: number;
  count: number;
  farmacias: Array<{ farmacia_id: number; nome_farmacia: string; distancia_km: number }>;
}

/**
 * Conta e lista farmácias a até radiusKm de venues que têm a especialidade informada.
 */
export async function getPharmacyCountBySpecialtyAndRadius(
  specialty: string,
  radiusKm: number
): Promise<PharmacyCountBySpecialtyResult> {
  const { data, error } = await supabase.rpc('get_pharmacy_count_by_specialty_and_radius', {
    p_specialty: specialty,
    p_radius_km: radiusKm
  });
  if (error) throw error;
  const raw = (data ?? {}) as {
    specialty?: string;
    radius_km?: number;
    count?: number;
    farmacias?: Array<{ farmacia_id: number; nome_farmacia: string; distancia_km: number }>;
  };
  return {
    specialty: raw.specialty ?? specialty,
    radius_km: raw.radius_km ?? radiusKm,
    count: raw.count ?? 0,
    farmacias: raw.farmacias ?? []
  };
}

export interface VenuesByPharmacyRadiusRow {
  radius_km: number;
  venue_count: number;
  screen_count: number;
}

/**
 * Resumo por raio: quantidade de venues e de telas com farmácia no raio.
 * Útil para o relatório "Venues por proximidade de farmácia".
 */
export async function getVenuesByPharmacyRadiusSummary(
  radiiKm: number[] = [1, 2, 3, 4, 5]
): Promise<VenuesByPharmacyRadiusRow[]> {
  const { data, error } = await supabase.rpc('get_venues_by_pharmacy_radius_summary', {
    radii_km: radiiKm
  });
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    radius_km: number;
    venue_count: number | string;
    screen_count: number | string;
  }>;
  return rows.map(r => ({
    radius_km: r.radius_km,
    venue_count: typeof r.venue_count === 'string' ? parseInt(r.venue_count, 10) : (r.venue_count ?? 0),
    screen_count: typeof r.screen_count === 'string' ? parseInt(r.screen_count, 10) : (r.screen_count ?? 0)
  }));
}
