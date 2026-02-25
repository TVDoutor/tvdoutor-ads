import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateUserRequest {
  user_id: string;
  display_name?: string;
  full_name?: string;
  password?: string;
  role?: 'user' | 'manager' | 'admin' | 'super_admin' | 'client';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autorização necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAnon.auth.getUser(token)

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('super_admin')
      .eq('id', caller.id)
      .single()

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)

    const isAdmin = profile?.super_admin === true ||
      roles?.some((r: { role: string }) => r.role === 'admin' || r.role === 'super_admin')

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem editar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { user_id, display_name, full_name, password, role }: UpdateUserRequest = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const nameToUse = display_name ?? full_name

    if (password !== undefined && password !== null && password !== '') {
      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Senha deve ter pelo menos 6 caracteres' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const { error: pwdErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password })
      if (pwdErr) {
        console.error('Erro ao atualizar senha:', pwdErr)
        return new Response(
          JSON.stringify({ error: pwdErr.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const profilePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (nameToUse !== undefined && nameToUse !== null) {
      profilePayload.display_name = nameToUse
      profilePayload.full_name = nameToUse
    }
    if (role !== undefined) {
      profilePayload.super_admin = role === 'super_admin'
      profilePayload.role = role
    }

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update(profilePayload)
      .eq('id', user_id)

    if (profileErr) {
      console.error('Erro ao atualizar perfil:', profileErr)
      return new Response(
        JSON.stringify({ error: profileErr.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (role !== undefined) {
      const { data: currentRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user_id)

      const currentRole = currentRoles?.[0]?.role
      if (currentRole !== role) {
        await supabaseAdmin.from('user_roles').delete().eq('user_id', user_id)
        await supabaseAdmin.from('user_roles').insert({ user_id, role })
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('admin-update-user error:', err)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
