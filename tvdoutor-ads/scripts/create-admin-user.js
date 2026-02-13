#!/usr/bin/env node

/**
 * Script para criar usuário admin no Supabase
 * 
 * Uso:
 * node scripts/create-admin-user.js
 * 
 * Ou com parâmetros:
 * EMAIL=publicidade3@tvdoutor.com.br PASSWORD=Publi@2025! FULL_NAME="Maria Laura" ROLE=admin node scripts/create-admin-user.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Parâmetros do usuário (pode ser sobrescrito por variáveis de ambiente)
const USER_CONFIG = {
  email: process.env.EMAIL || 'publicidade3@tvdoutor.com.br',
  password: process.env.PASSWORD || 'Publi@2025!',
  full_name: process.env.FULL_NAME || 'Maria Laura',
  role: process.env.ROLE || 'admin' // 'admin' ou 'super_admin'
};

// Validações
function validateConfig() {
  if (!SUPABASE_URL) {
    throw new Error('SUPABASE_URL não encontrada nas variáveis de ambiente');
  }
  
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não encontrada nas variáveis de ambiente');
  }

  if (!USER_CONFIG.email || !USER_CONFIG.password || !USER_CONFIG.full_name) {
    throw new Error('EMAIL, PASSWORD e FULL_NAME são obrigatórios');
  }

  // Validar formato do email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(USER_CONFIG.email)) {
    throw new Error('Formato de email inválido');
  }

  // Validar força da senha
  if (USER_CONFIG.password.length < 8) {
    throw new Error('Senha deve ter pelo menos 8 caracteres');
  }

  // Validar role
  if (!['admin', 'super_admin'].includes(USER_CONFIG.role)) {
    throw new Error('Role deve ser "admin" ou "super_admin"');
  }
}

// Função principal
async function createAdminUser() {
  try {
    console.log('🚀 Iniciando criação de usuário admin...');
    console.log('📧 Email:', USER_CONFIG.email);
    console.log('👤 Nome:', USER_CONFIG.full_name);
    console.log('🔑 Role:', USER_CONFIG.role);
    console.log('');

    // Validar configuração
    validateConfig();

    // Criar cliente Supabase com service role key (admin)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('✅ Cliente Supabase criado com sucesso');

    // 1. Criar usuário no sistema de autenticação
    console.log('📝 Criando usuário no sistema de autenticação...');
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: USER_CONFIG.email,
      password: USER_CONFIG.password,
      email_confirm: true, // Pular confirmação de email
      user_metadata: { 
        full_name: USER_CONFIG.full_name,
        role: USER_CONFIG.role
      }
    });

    if (authError) {
      throw new Error(`Erro ao criar usuário no sistema de autenticação: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Falha na criação do usuário - nenhum dado de usuário retornado');
    }

    console.log('✅ Usuário criado no sistema de autenticação:', authData.user.id);

    // 2. Criar perfil na tabela public.profiles
    console.log('👤 Criando perfil na tabela profiles...');
    
    const profileData = {
      id: authData.user.id,
      email: authData.user.email,
      full_name: USER_CONFIG.full_name,
      display_name: USER_CONFIG.full_name,
      role: 'user', // Manter como 'user' na tabela profiles
      super_admin: USER_CONFIG.role === 'super_admin' // Usar campo booleano super_admin
    };

    const { data: profileResult, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData)
      .select();

    if (profileError) {
      console.error('❌ Erro ao criar perfil:', profileError);
      
      // Se a criação do perfil falhar, limpar o usuário de auth
      console.log('🧹 Limpando usuário de autenticação...');
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      throw new Error(`Erro ao criar perfil do usuário: ${profileError.message}`);
    }

    console.log('✅ Perfil criado com sucesso');

    // 3. Criar entrada na tabela user_roles (se existir)
    try {
      console.log('🔐 Criando entrada na tabela user_roles...');
      
      const roleData = {
        user_id: authData.user.id,
        role: USER_CONFIG.role,
        created_at: new Date().toISOString()
      };

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert(roleData);

      if (roleError) {
        console.warn('⚠️  Aviso: Não foi possível criar entrada em user_roles (tabela pode não existir):', roleError.message);
      } else {
        console.log('✅ Entrada criada em user_roles');
      }
    } catch (roleError) {
      console.warn('⚠️  Aviso: Criação de role ignorada (tabela pode não existir):', roleError.message);
    }

    // 4. Verificar se o usuário foi criado corretamente
    console.log('🔍 Verificando se o usuário foi criado corretamente...');
    
    const { data: verifyProfile, error: verifyError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (verifyError) {
      console.warn('⚠️  Aviso: Não foi possível verificar o perfil criado:', verifyError.message);
    } else {
      console.log('✅ Verificação concluída - perfil encontrado');
      console.log('📊 Dados do perfil:', {
        id: verifyProfile.id,
        email: verifyProfile.email,
        full_name: verifyProfile.full_name,
        role: verifyProfile.role,
        super_admin: verifyProfile.super_admin
      });
    }

    console.log('');
    console.log('🎉 USUÁRIO ADMIN CRIADO COM SUCESSO!');
    console.log('');
    console.log('📋 Resumo:');
    console.log(`   ID: ${authData.user.id}`);
    console.log(`   Email: ${authData.user.email}`);
    console.log(`   Nome: ${USER_CONFIG.full_name}`);
    console.log(`   Role: ${USER_CONFIG.role}`);
    console.log(`   Super Admin: ${USER_CONFIG.role === 'super_admin' ? 'Sim' : 'Não'}`);
    console.log(`   Criado em: ${authData.user.created_at}`);
    console.log('');
    console.log('🔗 O usuário pode fazer login imediatamente com as credenciais fornecidas.');

  } catch (error) {
    console.error('');
    console.error('❌ ERRO AO CRIAR USUÁRIO ADMIN:');
    console.error('   ', error.message);
    console.error('');
    
    if (error.message.includes('User already registered')) {
      console.error('💡 Dica: Este email já está registrado. Tente com um email diferente.');
    } else if (error.message.includes('Password should be at least')) {
      console.error('💡 Dica: A senha deve ter pelo menos 8 caracteres.');
    } else if (error.message.includes('Invalid email')) {
      console.error('💡 Dica: Verifique se o formato do email está correto.');
    }
    
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createAdminUser();
}

export { createAdminUser };
