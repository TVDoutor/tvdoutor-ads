import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get the Mapbox public token from environment variables
    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN')
    
    if (!mapboxToken) {
      console.error('MAPBOX_PUBLIC_TOKEN not configured')
      return new Response(
        JSON.stringify({ 
          error: 'Mapbox token not configured',
          message: 'Please configure MAPBOX_PUBLIC_TOKEN in Supabase Functions Secrets'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Return the token
    return new Response(
      JSON.stringify({ 
        token: mapboxToken,
        user_id: user.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in mapbox-token function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Authentication failed',
        message: error.message 
      }),
      { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
