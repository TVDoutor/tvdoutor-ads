import { supabase } from '@/integrations/supabase/client'
import { geocodeAddress } from '@/lib/geocoding'

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

function buildAddress(row: PharmacyRow): string {
  const street = [row.tipo_logradouro, row.endereco].filter(Boolean).join(' ')
  const parts = [street, row.numero, row.bairro, row.cidade, row.uf, row.cep].filter(Boolean)
  return parts.join(', ')
}

export async function getPharmacies(filters?: { uf?: string; cidade?: string; grupo?: string; bairro?: string }): Promise<PharmacyRow[]> {
  let query = supabase.from('v_farmacias_public').select('*')
  if (filters?.uf && filters.uf !== 'all') query = query.eq('uf', filters.uf)
  if (filters?.cidade && filters.cidade !== 'all') query = query.eq('cidade', filters.cidade)
  if (filters?.grupo && filters.grupo !== 'all') query = query.eq('grupo', filters.grupo)
  if (filters?.bairro && filters.bairro !== 'all') query = query.eq('bairro', filters.bairro)
  const { data, error } = await query
  if (error) throw error
  return (data as any[]) as PharmacyRow[]
}

export async function fetchFarmacias(): Promise<FarmaciaPublica[]> {
  const { data, error } = await supabase
    .from('v_farmacias_public')
    .select('id, nome, cidade, uf, latitude, longitude, cep, bairro, endereco, numero, grupo')
  if (error) throw error
  return (data ?? []) as FarmaciaPublica[]
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