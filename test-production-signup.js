#!/usr/bin/env node

/**
 * Teste de Cadastro no Ambiente de Produção
 * Testa o cadastro usando a URL de produção do Supabase
 */

import { createClient } from '@supabase/supabase-js';

console.log('🧪 Teste de Cadastro - Ambiente de Produção');
console.log('============================================');

// Configuração do ambiente de produção
const SUPABASE_URL = 'https://vaogzhwzucijiyvyglls.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NgqtM9lDxmuihvScJ9V-NA_1Qz7blee';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testProductionSignup() {
  try {
    console.log('📧 Testando cadastro no ambiente de produção...');
    
    const testEmail = `teste-prod-${Date.now()}@tvdoutor.com.br`;
    console.log(`Email: ${testEmail}`);
    console.log(`URL: ${SUPABASE_URL}`);
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'Teste@2025!',
      options: {
        emailRedirectTo: 'https://tvdoutor-ads.vercel.app/',
        data: {
          full_name: 'Usuário Teste Produção',
        }
      }
    });

    if (error) {
      console.error('❌ Erro no cadastro:', error.message);
      
      // Análise detalhada do erro
      if (error.message.includes('Database error')) {
        console.log('🔍 Tipo: Erro de banco de dados');
        console.log('💡 Possível causa: Políticas RLS ou trigger falhando');
      } else if (error.message.includes('already registered')) {
        console.log('🔍 Tipo: Usuário já existe');
      } else if (error.message.includes('Invalid email')) {
        console.log('🔍 Tipo: Email inválido');
      } else if (error.message.includes('Password')) {
        console.log('🔍 Tipo: Problema com senha');
      } else {
        console.log('🔍 Tipo: Erro desconhecido');
        console.log('📊 Detalhes:', JSON.stringify(error, null, 2));
      }
      
      return false;
    }

    if (data.user) {
      console.log('✅ Cadastro realizado com sucesso!');
      console.log(`📊 User ID: ${data.user.id}`);
      console.log(`📧 Email: ${data.user.email}`);
      console.log(`🔐 Email confirmado: ${data.user.email_confirmed_at ? 'Sim' : 'Não'}`);
      
      // Testar se o profile foi criado
      await testProfileCreation(data.user.id);
      
      return true;
    } else {
      console.log('⚠️ Cadastro realizado, mas usuário não retornado');
      return false;
    }

  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    console.log('📊 Stack trace:', error.stack);
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
      method: 'GET',
      body: {}
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
  console.log('🚀 Iniciando testes no ambiente de produção...\n');
  
  // Teste 1: Cadastro de usuário
  const signupSuccess = await testProductionSignup();
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Teste 2: Edge Function
  const edgeFunctionSuccess = await testEdgeFunction();
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Resultado final
  console.log('📊 RESULTADO DOS TESTES (PRODUÇÃO):');
  console.log('====================================');
  console.log(`Cadastro de usuário: ${signupSuccess ? '✅ PASSOU' : '❌ FALHOU'}`);
  console.log(`Edge Function: ${edgeFunctionSuccess ? '✅ PASSOU' : '❌ FALHOU'}`);
  
  if (signupSuccess && edgeFunctionSuccess) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('O sistema de cadastro está funcionando corretamente em produção.');
  } else {
    console.log('\n⚠️ ALGUNS TESTES FALHARAM!');
    console.log('Verifique os erros acima e corrija os problemas.');
  }
  
  console.log('\n💡 Próximos passos:');
  console.log('1. Teste o cadastro no navegador');
  console.log('2. Verifique os logs do Supabase Dashboard');
  console.log('3. Monitore o funcionamento em produção');
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testProductionSignup, testProfileCreation, testEdgeFunction };
