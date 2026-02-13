import { supabase } from '@/integrations/supabase/client'
import { geocodeAddress } from '@/lib/geocoding'

const FARMACIA_VIEW = 'view_farmacias_detalhe'
const FARMACIA_TABLE = 'farmacias'
const FARMACIA_COLUMNS = '*'
const FARMACIA_OPTIONAL_COLUMNS = ['nome', 'google_formatted_address', 'lat', 'lng', 'latitude', 'longitude'] as const
type FarmaciaOptionalColumn = (typeof FARMACIA_OPTIONAL_COLUMNS)[number]

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

export interface PharmacyRecord {
  id?: number
  nome?: string
  fantasia?: string
  tipo_logradouro?: string | null
  endereco?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  cep?: string | null
  cep_int?: number | null
  cnpj?: string | null
  grupo?: string | null
  lat?: number | null
  lng?: number | null
  latitude?: number | string | null
  longitude?: number | string | null
  google_formatted_address?: string | null
  created_at?: string
  updated_at?: string
}

export type PharmacyInput = Omit<PharmacyRecord, 'created_at' | 'updated_at' | 'cep_int'> & { id?: number }

export type FarmaciaPublica = {
  id: number
  nome: string
  cidade: string
  uf: string
  latitude: number | null
  longitude: number | null
  cep: string | null
  bairro: string | null
  endereco: string | null
  numero: string | null
  complemento: string | null
  tipo_logradouro: string | null
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
  const getFirstValue = (...candidates: any[]) => {
    for (const value of candidates) {
      if (value !== undefined && value !== null && value !== '') {
        return value
      }
    }
    return null
  }

  const tipoLogradouro = getFirstValue(
    row.tipo_logradouro,
    row.TIPO_LOGRADOURO,
    row.tipoLogradouro,
    row.tipo_log,
    row.tipo
  )

  const logradouro = getFirstValue(
    row.endereco,
    row.ENDERECO,
    row.logradouro,
    row.LOGRADOURO,
    row.nome_logradouro,
    row.NOME_LOGRADOURO,
    row.rua,
    row.RUA,
    row.endereco_formatado,
    row.endereco_completo,
    row.logradouro_nome
  )

  const numero = getFirstValue(
    row.numero,
    row.NUMERO,
    row.numero_endereco,
    row.NUMERO_ENDERECO,
    row.num,
    row.NUM
  )

  const complemento = getFirstValue(
    row.complemento,
    row.COMPLEMENTO,
    row.complemento_endereco,
    row.COMPLEMENTO_ENDERECO,
    row.compl,
    row.COMPL
  )

  const latitude = sanitizeCoordinate(
    row.lat ?? row.latitude ?? row.y ?? row.latitudine ?? row.latitude_dec
  )
  const longitude = sanitizeCoordinate(
    row.lng ?? row.longitude ?? row.x ?? row.longitudine ?? row.longitude_dec
  )

  return {
    id: Number(row.id),
    nome: String(row.nome ?? row.fantasia ?? row.nome_farmacia ?? row.razao_social ?? ''),
    cidade: String(row.cidade ?? row.city ?? ''),
    uf: String(row.uf ?? row.estado ?? ''),
    latitude: latitude,
    longitude: longitude,
    cep: getFirstValue(row.cep, row.CEP, row.cep_formatado, row.CEP_FORMATADO) as string | null,
    bairro: getFirstValue(row.bairro, row.BAIRRO) as string | null,
    endereco: logradouro ? String(logradouro) : null,
    numero: numero ? String(numero) : null,
    complemento: complemento ? String(complemento) : null,
    tipo_logradouro: tipoLogradouro ? String(tipoLogradouro) : null,
    grupo: getFirstValue(row.grupo, row.rede, row.GRUPO, row.REDE) as string | null,
  }
}

function sanitizeString(value: any): string | null {
  if (value === undefined || value === null) return null
  const str = String(value).trim()
  return str.length ? str : null
}

function sanitizeDigits(value: any, maxLength?: number): string | null {
  if (value === undefined || value === null) return null
  const digits = String(value).replace(/\D/g, '')
  if (!digits) return null
  return maxLength ? digits.slice(0, maxLength) : digits
}

function sanitizeCoordinate(value: any): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function normalizePharmacyInput(input: PharmacyInput): PharmacyRecord {
  return {
    id: input.id,
    nome: sanitizeString(input.nome) ?? sanitizeString(input.fantasia) ?? null,
    fantasia: sanitizeString(input.fantasia),
    tipo_logradouro: sanitizeString(input.tipo_logradouro),
    endereco: sanitizeString(input.endereco),
    numero: sanitizeString(input.numero),
    complemento: sanitizeString(input.complemento),
    bairro: sanitizeString(input.bairro),
    cidade: sanitizeString(input.cidade),
    uf: sanitizeString(input.uf),
    cep: sanitizeDigits(input.cep, 8),
    cnpj: sanitizeDigits(input.cnpj, 14),
    grupo: sanitizeString(input.grupo),
    lat: sanitizeCoordinate(input.lat),
    lng: sanitizeCoordinate(input.lng),
    google_formatted_address: sanitizeString(input.google_formatted_address),
  }
}

function getErrorMessage(error: any): string | null {
  if (!error) return null
  if (typeof error === 'string') return error
  return error?.message ?? error?.details ?? error?.hint ?? null
}

function isMissingColumnError(error: any, column: FarmaciaOptionalColumn): boolean {
  const message = getErrorMessage(error)
  if (!message) return false
  const normalized = message.toLowerCase()
  const target = column.toLowerCase()
  return (
    normalized.includes(`'${target}' column`) ||
    normalized.includes(`column '${target}'`) ||
    normalized.includes(`column "${target}"`) ||
    normalized.includes(`farmacias.${target}`) ||
    normalized.includes(`${target} does not exist`)
  )
}

function detectMissingColumns(error: any): FarmaciaOptionalColumn[] {
  return FARMACIA_OPTIONAL_COLUMNS.filter(column => isMissingColumnError(error, column))
}

function warnMissingColumns(context: string, columns: FarmaciaOptionalColumn[], error: any) {
  console.warn(
    `[farmacias] Coluna(s) ${columns.join(', ')} ausentes durante ${context}. Aplicando fallback até que a migração seja executada.`,
    error
  )
}

function buildFallbackPayload(record: PharmacyRecord, columns: FarmaciaOptionalColumn[]): Record<string, any> {
  if (!columns.length) return record
  const clone: Record<string, any> = { ...record }
  for (const column of columns) {
    switch (column) {
      case 'lat': {
        const value = record.lat ?? record.latitude ?? null
        delete clone.lat
        if (value != null) clone.latitude = value
        break
      }
      case 'lng': {
        const value = record.lng ?? record.longitude ?? null
        delete clone.lng
        if (value != null) clone.longitude = value
        break
      }
      default:
        delete clone[column]
        break
    }
  }
  return clone
}

async function fetchFarmaciasOrdered(orderBy: 'nome' | 'fantasia', batchSize = 1000): Promise<PharmacyRecord[]> {
  let from = 0
  const rows: PharmacyRecord[] = []
  while (true) {
    const { data, error } = await supabase
      .from('farmacias')
      .select('*')
      .order(orderBy, { ascending: true, nullsFirst: true })
      .range(from, from + batchSize - 1)
    if (error) throw error
    const batch = (data ?? []) as PharmacyRecord[]
    rows.push(...batch)
    if (batch.length < batchSize) break
    from += batchSize
  }
  return rows
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

function filterFarmaciasByBounds(rows: FarmaciaPublica[], bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  if (!bounds) return rows
  return rows.filter(row => {
    if (row.latitude == null || row.longitude == null) return false
    return (
      row.latitude >= bounds.minLat &&
      row.latitude <= bounds.maxLat &&
      row.longitude >= bounds.minLng &&
      row.longitude <= bounds.maxLng
    )
  })
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

async function fetchFarmaciasFromSource(
  source: string,
  options?: {
    filters?: { uf?: string; cidade?: string; grupo?: string; bairro?: string }
    bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  }
): Promise<FarmaciaPublica[]> {
  const pageSize = 1000
  let from = 0
  const collected: FarmaciaPublica[] = []
  const f = options?.filters

  while (true) {
    let query = supabase.from(source).select(FARMACIA_COLUMNS).range(from, from + pageSize - 1)
    if (f?.uf && f.uf !== 'all') query = query.eq('uf', f.uf)
    if (f?.cidade && f.cidade !== 'all') query = query.eq('cidade', f.cidade)
    if (f?.grupo && f.grupo !== 'all') query = query.eq('grupo', f.grupo)
    if (f?.bairro && f.bairro !== 'all') query = query.eq('bairro', f.bairro)

    const { data, error } = await query
    if (error) throw error
    const batch = (data ?? []) as any[]
    collected.push(...batch.map(mapFarmaciaRowToPublic))
    if (batch.length < pageSize) break
    from += pageSize
  }

  return filterFarmaciasByBounds(collected, options?.bounds)
}

async function fetchFarmaciasWithFallback(options?: {
  filters?: { uf?: string; cidade?: string; grupo?: string; bairro?: string }
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }
}): Promise<FarmaciaPublica[]> {
  try {
    const rows = await fetchFarmaciasFromSource(FARMACIA_TABLE, options)
    if (rows.length) return rows
    console.warn('[farmacias] Nenhum registro encontrado na tabela principal; usando view como fallback.')
  } catch (error) {
    console.warn('[farmacias] Falha ao carregar a tabela principal, usando view como fallback.', error)
  }
  return fetchFarmaciasFromSource(FARMACIA_VIEW, options)
}

export async function fetchFarmacias(options?: {
  filters?: { uf?: string; cidade?: string; grupo?: string; bairro?: string }
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }
}): Promise<FarmaciaPublica[]> {
  return fetchFarmaciasWithFallback(options)
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
  const rows = await fetchFarmaciasWithFallback()
  const set = new Set<string>()
  for (const row of rows) {
    const uf = String(row.uf ?? '').toUpperCase()
    if (uf) set.add(uf)
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

export async function fetchFarmaciasPorRaio(
  lat: number,
  lon: number,
  raioKm: number,
  filters?: { uf?: string; cidade?: string; grupo?: string; bairro?: string }
): Promise<FarmaciaPublica[]> {
  const rows = await fetchFarmaciasWithFallback({ filters })
  if (!rows.length) return []
  return rows.filter(row => {
    if (row.latitude == null || row.longitude == null) return false
    return calculateDistanceKm(lat, lon, row.latitude, row.longitude) <= raioKm
  })
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

export async function fetchAllPharmacies(): Promise<PharmacyRecord[]> {
  try {
    return await fetchFarmaciasOrdered('nome')
  } catch (error) {
    if (!isMissingColumnError(error, 'nome')) throw error
    warnMissingColumns('a listagem', ['nome'], error)
    return await fetchFarmaciasOrdered('fantasia')
  }
}

export async function createPharmacy(payload: PharmacyInput): Promise<PharmacyRecord> {
  const normalized = normalizePharmacyInput(payload)
  let { data, error } = await supabase.from('farmacias').insert(normalized).select('*').single()
  if (error) {
    const missingColumns = detectMissingColumns(error)
    if (!missingColumns.length) throw error
    warnMissingColumns('a inserção', missingColumns, error)
    const fallbackPayload = buildFallbackPayload(normalized, missingColumns)
    const fallback = await supabase.from('farmacias').insert(fallbackPayload).select('*').single()
    if (fallback.error) throw fallback.error
    data = fallback.data
  }
  return data as PharmacyRecord
}

export async function updatePharmacyRecord(id: number, payload: PharmacyInput): Promise<PharmacyRecord> {
  const normalized = normalizePharmacyInput({ ...payload, id })
  let { data, error } = await supabase.from('farmacias').update(normalized).eq('id', id).select('*').single()
  if (error) {
    const missingColumns = detectMissingColumns(error)
    if (!missingColumns.length) throw error
    warnMissingColumns('a atualização', missingColumns, error)
    const fallbackPayload = buildFallbackPayload(normalized, missingColumns)
    const fallback = await supabase.from('farmacias').update(fallbackPayload).eq('id', id).select('*').single()
    if (fallback.error) throw fallback.error
    data = fallback.data
  }
  return data as PharmacyRecord
}

export async function deletePharmacyRecord(id: number): Promise<void> {
  const { error } = await supabase
    .from('farmacias')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function bulkUpsertPharmacies(records: PharmacyInput[]): Promise<number> {
  if (!records.length) return 0
  const normalized = records.map(normalizePharmacyInput)
  let { data, error } = await supabase.from('farmacias').upsert(normalized).select('id')
  if (error) {
    const missingColumns = detectMissingColumns(error)
    if (!missingColumns.length) throw error
    warnMissingColumns('o upsert em lote', missingColumns, error)
    const fallbackPayload = normalized.map(record => buildFallbackPayload(record, missingColumns))
    const fallback = await supabase.from('farmacias').upsert(fallbackPayload).select('id')
    if (fallback.error) throw fallback.error
    data = fallback.data
  }
  return data?.length ?? 0
}
