import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateAdminUserRequest {
  email: string;
  password: string;
  full_name: string;
  role?: 'admin' | 'super_admin';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const { email, password, full_name, role = 'admin' }: CreateAdminUserRequest = await req.json()

    // Validar campos obrigatórios
    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios ausentes: email, password, full_name' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          error: 'Formato de email inválido' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar força da senha
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ 
          error: 'Senha deve ter pelo menos 8 caracteres' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar role
    if (!['admin', 'super_admin'].includes(role)) {
      return new Response(
        JSON.stringify({ 
          error: 'Role inválida. Deve ser "admin" ou "super_admin"' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Criando usuário admin: ${email} com role: ${role}`)

    // Criar usuário no auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Pular confirmação de email
      user_metadata: { 
        full_name,
        role: role
      }
    })

    if (authError) {
      console.error('Erro na criação do usuário:', authError)
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao criar usuário no sistema de autenticação',
          details: authError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ 
          error: 'Falha na criação do usuário - nenhum dado de usuário retornado' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Usuário criado no auth: ${authData.user.id}`)

    // Criar perfil na tabela public.profiles
    const profileData = {
      id: authData.user.id,
      email: authData.user.email,
      full_name,
      display_name: full_name,
      role: role === 'super_admin' ? 'user' : 'user', // Keep as user in profiles table
      super_admin: role === 'super_admin' // Use super_admin boolean field
    }

    const { data: profileResult, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData)
      .select()

    if (profileError) {
      console.error('Erro na criação do perfil:', profileError)
      
      // Se a criação do perfil falhar, limpar o usuário de auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao criar perfil do usuário',
          details: profileError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Criar entrada na tabela user_roles (se existir)
    try {
      const roleData = {
        user_id: authData.user.id,
        role: role,
        created_at: new Date().toISOString()
      }

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert(roleData)

      if (roleError) {
        console.warn('Aviso na criação de role (tabela pode não existir):', roleError.message)
        // Não falhar a operação inteira se a tabela user_roles não existir
      } else {
        console.log(`Role criada em user_roles: ${role}`)
      }
    } catch (roleError) {
      console.warn('Criação de role ignorada (tabela pode não existir):', roleError)
    }

    console.log(`Usuário admin criado com sucesso: ${email}`)

    // Retornar resposta de sucesso
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuário admin criado com sucesso',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name,
          role,
          created_at: authData.user.created_at
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro inesperado:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
