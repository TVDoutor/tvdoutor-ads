import { supabase } from '@/integrations/supabase/client'
import { geocodeAddress } from '@/lib/geocoding'

const FARMACIA_VIEW = 'view_farmacias_detalhe'
const FARMACIA_COLUMNS = '*'

export interface PharmacyRow {
  id: string | number
  fantasia?: string
  tipo_logradouro?: string
  endereco?: string
  numero?: string
  complemento?: string | null
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
  cep_int?: number
  cnpj?: string
  grupo?: string
  lat?: number | null
  lng?: number | null
  google_formatted_address?: string | null
}

export type FarmaciaPublica = {
  id: number
  nome: string
  cidade: string
  uf: string
  latitude: number
  longitude: number
  cep: string | null
  bairro: string | null
  endereco: string | null
  numero: string | null
  grupo: string | null
}

export type NearestPharmacy = {
  venue_id: number
  nome_venue: string
  farmacia_id: number
  nome_farmacia: string
  distancia_km: number
}

function buildAddress(row: PharmacyRow): string {
  const street = [row.tipo_logradouro, row.endereco].filter(Boolean).join(' ')
  const parts = [street, row.numero, row.bairro, row.cidade, row.uf, row.cep].filter(Boolean)
  return parts.join(', ')
}

function mapFarmaciaRowToPublic(row: any): FarmaciaPublica {
  return {
    id: Number(row.id),
    nome: String(row.nome ?? row.fantasia ?? row.nome_farmacia ?? row.razao_social ?? ''),
    cidade: String(row.cidade ?? row.city ?? ''),
    uf: String(row.uf ?? row.estado ?? ''),
    latitude: Number(row.latitude ?? row.lat ?? row.y ?? 0),
    longitude: Number(row.longitude ?? row.lng ?? row.x ?? 0),
    cep: (row.cep ?? row.cep_formatado ?? null) as string | null,
    bairro: (row.bairro ?? null) as string | null,
    endereco: (row.endereco ?? row.logradouro ?? null) as string | null,
    numero: (row.numero ?? null) as string | null,
    grupo: (row.grupo ?? row.rede ?? null) as string | null,
  }
}

export async function getPharmacies(filters?: { uf?: string; cidade?: string; grupo?: string; bairro?: string }): Promise<PharmacyRow[]> {
  let query = supabase.from(FARMACIA_VIEW).select('*')
  if (filters?.uf && filters.uf !== 'all') query = query.eq('uf', filters.uf)
  if (filters?.cidade && filters.cidade !== 'all') query = query.eq('cidade', filters.cidade)
  if (filters?.grupo && filters.grupo !== 'all') query = query.eq('grupo', filters.grupo)
  if (filters?.bairro && filters.bairro !== 'all') query = query.eq('bairro', filters.bairro)
  const { data, error } = await query
  if (error) throw error
  return (data as any[]) as PharmacyRow[]
}

export async function fetchFarmacias(options?: {
  filters?: { uf?: string; cidade?: string; grupo?: string; bairro?: string }
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }
}): Promise<FarmaciaPublica[]> {
  const pageSize = 1000
  let from = 0
  const all: FarmaciaPublica[] = []
  let query = supabase.from(FARMACIA_VIEW).select(FARMACIA_COLUMNS)
  const f = options?.filters
  if (f?.uf && f.uf !== 'all') query = query.eq('uf', f.uf)
  if (f?.cidade && f.cidade !== 'all') query = query.eq('cidade', f.cidade)
  if (f?.grupo && f.grupo !== 'all') query = query.eq('grupo', f.grupo)
  if (f?.bairro && f.bairro !== 'all') query = query.eq('bairro', f.bairro)
  const b = options?.bounds
  if (b) {
    query = query.gte('latitude', b.minLat).lte('latitude', b.maxLat)
    query = query.gte('longitude', b.minLng).lte('longitude', b.maxLng)
  }
  while (true) {
    const { data, error } = await query.range(from, from + pageSize - 1)
    if (error) throw error
    const batch = (data ?? []) as any[]
    all.push(...batch.map(mapFarmaciaRowToPublic))
    if (batch.length < pageSize) break
    from += pageSize
  }
  return all
}

export async function updateMissingCoordinates(rows: PharmacyRow[], limit = 50): Promise<{ updated: number; errors: number }> {
  let updated = 0
  let errors = 0
  const targets = rows.filter(r => !r.lat || !r.lng).slice(0, limit)
  const table = 'farmacias'
  for (const row of targets) {
    try {
      const address = buildAddress(row)
      if (!address) continue
      const geo = await geocodeAddress(address)
      const { error } = await supabase
        .from(table)
        .update({ lat: geo.lat, lng: geo.lng, google_formatted_address: geo.google_formatted_address })
        .eq('id', row.id)
      if (error) throw error
      updated++
    } catch {
      errors++
    }
  }
  return { updated, errors }
}

function cepToInt(cep?: string | number): number | null {
  if (typeof cep === 'number') return cep
  if (!cep) return null
  const digits = String(cep).replace(/[^0-9]/g, '')
  if (!digits) return null
  return parseInt(digits, 10)
}

export async function updateCoordinatesFromCEP(rows: PharmacyRow[], limit = 200): Promise<{ updated: number; errors: number }> {
  let updated = 0
  let errors = 0
  const targets = rows.filter(r => (!r.lat || !r.lng) && (r.cep_int || r.cep)).slice(0, limit)
  const table = 'farmacias'
  for (const row of targets) {
    try {
      const cepInt = typeof row.cep_int === 'number' ? row.cep_int : cepToInt(row.cep)
      if (!cepInt) { errors++; continue }
      const { data, error } = await supabase
        .from('cep_geocode')
        .select('lat,lng,formatted_address')
        .eq('cep_int', cepInt)
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (!data || data.lat == null || data.lng == null) { errors++; continue }
      const { error: upErr } = await supabase
        .from(table)
        .update({ lat: data.lat, lng: data.lng, google_formatted_address: data.formatted_address })
        .eq('id', row.id)
      if (upErr) throw upErr
      updated++
    } catch {
      errors++
    }
  }
  return { updated, errors }
}

export async function fetchDistinctUFs(): Promise<string[]> {
  const pageSize = 1000
  let from = 0
  const set = new Set<string>()
  while (true) {
    const { data, error } = await supabase
      .from(FARMACIA_VIEW)
      .select('*')
      .range(from, from + pageSize - 1)
    if (error) throw error
    const batch = (data ?? []) as any[]
    for (const row of batch) {
      const uf = String(row.uf ?? row.estado ?? '').toUpperCase()
      if (uf) set.add(uf)
    }
    if (batch.length < pageSize) break
    from += pageSize
  }
  return Array.from(set).sort()
}

export async function getNearestPharmaciesForVenue(venueId: number, limit = 3): Promise<(NearestPharmacy & { detalhes?: FarmaciaPublica })[]> {
  const { data, error } = await supabase
    .from('mv_venue_farmacia_distancia')
    .select('venue_id,nome_venue,farmacia_id,nome_farmacia,distancia_km')
    .eq('venue_id', venueId)
    .order('distancia_km', { ascending: true })
    .limit(limit)
  if (error) throw error
  const rows = (data ?? []) as any[]
  if (!rows.length) return []
  const farmaciaIds = rows.map(r => r.farmacia_id).filter(Boolean)
  let detalhes: any[] = []
  if (farmaciaIds.length) {
    const { data: det, error: detErr } = await supabase
      .from(FARMACIA_VIEW)
      .select('*')
      .in('id', farmaciaIds)
    if (!detErr && det) detalhes = det as any[]
  }
  const byId = new Map<any, any>()
  for (const d of detalhes) byId.set(d.id, d)
  return rows.map(r => ({
    venue_id: Number(r.venue_id),
    nome_venue: String(r.nome_venue ?? ''),
    farmacia_id: Number(r.farmacia_id),
    nome_farmacia: String(r.nome_farmacia ?? ''),
    distancia_km: Number(r.distancia_km ?? 0),
    detalhes: byId.has(r.farmacia_id) ? mapFarmaciaRowToPublic(byId.get(r.farmacia_id)) : undefined
  }))
}

export async function fetchFarmaciasPorRaio(lat: number, lon: number, raioKm: number, filters?: { uf?: string; cidade?: string; grupo?: string; bairro?: string }): Promise<FarmaciaPublica[]> {
  const { data, error } = await supabase
    .rpc('get_farmacias_por_raio', { user_lat: lat, user_lon: lon, raio_km: raioKm })
  if (error) throw error
  let rows = (data ?? []) as any[]
  const f = filters
  if (f) {
    rows = rows.filter(row => (
      (!f.uf || f.uf === 'all' || String(row.uf ?? row.estado ?? '') === f.uf) &&
      (!f.cidade || f.cidade === 'all' || String(row.cidade ?? row.city ?? '') === f.cidade) &&
      (!f.grupo || f.grupo === 'all' || String(row.grupo ?? row.rede ?? '') === f.grupo) &&
      (!f.bairro || f.bairro === 'all' || String(row.bairro ?? '') === f.bairro)
    ))
  }
  return rows.map(mapFarmaciaRowToPublic)
}

export async function pullFarmaciasFromView(batchSize = 1000): Promise<{ upserted: number; errors: number }> {
  let upserted = 0
  let errors = 0
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from(FARMACIA_VIEW)
      .select('*')
      .range(from, from + batchSize - 1)
    if (error) throw error
    const rows = (data ?? []) as any[]
    if (!rows.length) break
    const payload = rows.map(r => ({
      cnpj: String(r.cnpj ?? ''),
      nome: String(r.fantasia ?? r.nome ?? ''),
      endereco: String(r.endereco_formatado ?? r.endereco ?? ''),
      latitude: r.latitude != null ? Number(r.latitude) : null,
      longitude: r.longitude != null ? Number(r.longitude) : null,
    }))
    try {
      const { error: upErr } = await supabase
        .from('farmacias')
        .upsert(payload, { onConflict: 'cnpj' })
      if (upErr) throw upErr
      upserted += payload.length
    } catch {
      errors += payload.length
    }
    if (rows.length < batchSize) break
    from += batchSize
  }
  return { upserted, errors }
}
