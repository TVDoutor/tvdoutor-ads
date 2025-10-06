#!/usr/bin/env node

/**
 * Script de Teste para Cadastro de Usuários
 * Testa se o problema de cadastro foi resolvido
 */

import { createClient } from '@supabase/supabase-js';

// Configuração
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

console.log('🧪 Teste de Cadastro de Usuários - TV Doutor ADS');
console.log('================================================');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  console.log('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Dados de teste
const testUser = {
  email: `teste-${Date.now()}@tvdoutor.com.br`,
  password: 'Teste@2025!',
  name: 'Usuário Teste'
};

async function testUserSignup() {
  try {
    console.log('📧 Testando cadastro de usuário...');
    console.log(`Email: ${testUser.email}`);
    
    // Tentar cadastrar usuário
    const { data, error } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        emailRedirectTo: `http://localhost:8080/`,
        data: {
          full_name: testUser.name,
        }
      }
    });

    if (error) {
      console.error('❌ Erro no cadastro:', error.message);
      
      // Analisar tipo de erro
      if (error.message.includes('Database error')) {
        console.log('🔍 Tipo: Erro de banco de dados (RLS/Schema)');
      } else if (error.message.includes('already registered')) {
        console.log('🔍 Tipo: Usuário já existe');
      } else if (error.message.includes('Invalid email')) {
        console.log('🔍 Tipo: Email inválido');
      } else if (error.message.includes('Password')) {
        console.log('🔍 Tipo: Problema com senha');
      } else {
        console.log('🔍 Tipo: Erro desconhecido');
      }
      
      return false;
    }

    if (data.user) {
      console.log('✅ Usuário criado com sucesso!');
      console.log(`📊 User ID: ${data.user.id}`);
      console.log(`📧 Email: ${data.user.email}`);
      console.log(`🔐 Email confirmado: ${data.user.email_confirmed_at ? 'Sim' : 'Não'}`);
      
      // Verificar se o profile foi criado
      await testProfileCreation(data.user.id);
      
      return true;
    } else {
      console.log('⚠️ Cadastro realizado, mas usuário não retornado');
      return false;
    }

  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    return false;
  }
}

async function testProfileCreation(userId) {
  try {
    console.log('👤 Verificando criação do profile...');
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar profile:', error.message);
      return false;
    }

    if (profile) {
      console.log('✅ Profile criado com sucesso!');
      console.log(`📊 Profile ID: ${profile.id}`);
      console.log(`👤 Nome: ${profile.display_name || profile.full_name}`);
      console.log(`📧 Email: ${profile.email}`);
      console.log(`🔐 Role: ${profile.role}`);
      return true;
    } else {
      console.log('❌ Profile não encontrado');
      return false;
    }

  } catch (error) {
    console.error('❌ Erro ao verificar profile:', error.message);
    return false;
  }
}

async function testEdgeFunction() {
  try {
    console.log('🔧 Testando Edge Function process-pending-emails...');
    
    const { data, error } = await supabase.functions.invoke('process-pending-emails', {
      method: 'GET'
    });

    if (error) {
      console.error('❌ Erro na Edge Function:', error.message);
      
      if (error.message.includes('401')) {
        console.log('🔍 Tipo: Erro de autenticação (401 Unauthorized)');
      } else if (error.message.includes('500')) {
        console.log('🔍 Tipo: Erro interno do servidor (500)');
      } else {
        console.log('🔍 Tipo: Erro desconhecido');
      }
      
      return false;
    }

    console.log('✅ Edge Function funcionando!');
    console.log(`📊 Resposta:`, data);
    return true;

  } catch (error) {
    console.error('❌ Erro ao testar Edge Function:', error.message);
    return false;
  }
}

// Executar testes
async function runTests() {
  console.log('🚀 Iniciando testes...\n');
  
  // Teste 1: Cadastro de usuário
  const signupSuccess = await testUserSignup();
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Teste 2: Edge Function
  const edgeFunctionSuccess = await testEdgeFunction();
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Resultado final
  console.log('📊 RESULTADO DOS TESTES:');
  console.log('========================');
  console.log(`Cadastro de usuário: ${signupSuccess ? '✅ PASSOU' : '❌ FALHOU'}`);
  console.log(`Edge Function: ${edgeFunctionSuccess ? '✅ PASSOU' : '❌ FALHOU'}`);
  
  if (signupSuccess && edgeFunctionSuccess) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('O sistema de cadastro está funcionando corretamente.');
  } else {
    console.log('\n⚠️ ALGUNS TESTES FALHARAM!');
    console.log('Verifique os erros acima e corrija os problemas.');
  }
  
  console.log('\n💡 Próximos passos:');
  console.log('1. Teste o cadastro no navegador');
  console.log('2. Verifique os logs do Supabase');
  console.log('3. Monitore o funcionamento em produção');
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testUserSignup, testProfileCreation, testEdgeFunction };
