import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cache simples em memória (para produção, considere usar Redis)
const cache = new Map<string, { data: any, timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

interface HeatmapFilters {
  startDate?: string
  endDate?: string
  city?: string
  class?: string
  normalize?: boolean
  stats?: boolean
  cities?: boolean
  classes?: boolean
}

function getCacheKey(filters: HeatmapFilters): string {
  return JSON.stringify(filters)
}

function getCachedData(key: string): any | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  cache.delete(key)
  return null
}

function setCachedData(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() })
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create supabase client to verify JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabaseClient.auth.getUser(token)
    
    if (error || !user) {
      throw new Error('Invalid or expired token')
    }

    // Parse request body
    const body = await req.json().catch(() => ({}))
    const filters: HeatmapFilters = {
      startDate: body.startDate || undefined,
      endDate: body.endDate || undefined,
      city: body.city || undefined,
      class: body.class || undefined,
      normalize: body.normalize || false,
      stats: body.stats || false,
      cities: body.cities || false,
      classes: body.classes || false
    }

    // Check cache first
    const cacheKey = getCacheKey(filters)
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      console.log('📦 Returning cached data for key:', cacheKey)
      return new Response(
        JSON.stringify(cachedData),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create service role client for accessing the functions
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    let result: any = {}

    // Handle different request types
    if (filters.stats) {
      // Get statistics
      const { data: statsData, error: statsError } = await supabaseService
        .rpc('get_heatmap_stats', {
          p_start_date: filters.startDate,
          p_end_date: filters.endDate,
          p_city: filters.city,
          p_class: filters.class
        })

      if (statsError) {
        console.error('Erro ao buscar estatísticas:', statsError)
        throw statsError
      }

      result.stats = statsData[0] || {
        total_screens: 0,
        total_proposals: 0,
        max_intensity: 0,
        avg_intensity: 0,
        cities_count: 0,
        classes_count: 0
      }
    }

    if (filters.cities) {
      // Get available cities
      const { data: citiesData, error: citiesError } = await supabaseService
        .rpc('get_available_cities', {
          p_start_date: filters.startDate,
          p_end_date: filters.endDate
        })

      if (citiesError) {
        console.error('Erro ao buscar cidades:', citiesError)
        throw citiesError
      }

      result.cities = citiesData || []
    }

    if (filters.classes) {
      // Get available classes
      const { data: classesData, error: classesError } = await supabaseService
        .rpc('get_available_classes', {
          p_start_date: filters.startDate,
          p_end_date: filters.endDate
        })

      if (classesError) {
        console.error('Erro ao buscar classes:', classesError)
        throw classesError
      }

      result.classes = classesData || []
    }

    // Get heatmap data (always include this)
    const { data: heatmapData, error: heatmapError } = await supabaseService
      .rpc('get_heatmap_data', {
        p_start_date: filters.startDate,
        p_end_date: filters.endDate,
        p_city: filters.city,
        p_class: filters.class,
        p_normalize: filters.normalize
      })

    if (heatmapError) {
      console.error('Erro ao buscar dados do heatmap:', heatmapError)
      throw heatmapError
    }

    // Format heatmap data for frontend
    result.heatmap = heatmapData.map(item => [
      item.lat, 
      item.lng, 
      filters.normalize ? item.normalized_intensity : item.proposal_count
    ])

    // Add metadata
    result.metadata = {
      filters,
      totalPoints: heatmapData.length,
      cacheKey,
      timestamp: new Date().toISOString()
    }

    // Cache the result
    setCachedData(cacheKey, result)

    console.log('✅ Heatmap data fetched and cached:', {
      totalPoints: result.heatmap.length,
      filters,
      hasStats: !!result.stats,
      hasCities: !!result.cities,
      hasClasses: !!result.classes
    })

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in maps-heatmap function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
