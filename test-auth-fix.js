// 🧪 Teste das Correções de Autenticação
// Este script testa se as correções resolveram os problemas de autenticação

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://vaogzhwzucijiyvyglls.supabase.co';
const supabaseAnonKey = 'sb_publishable_NgqtM9lDxmuihvScJ9V-NA_1Qz7blee';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2d6aHd6dWNpaml5dnlnbGxzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY5MDQwMCwiZXhwIjoyMDcwMjY2NDAwfQ.B6yoRHpcm0aHJqAO_yMUJ0zOa7S9SyC1f1LVSPXZ9Ug';

async function testSupabaseConnection() {
  console.log('🔧 Testando conexão com Supabase...');
  
  try {
    // Teste com chave anônima
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Erro na conexão:', error.message);
      return false;
    }
    
    console.log('✅ Conexão com Supabase funcionando');
    return true;
  } catch (error) {
    console.log('❌ Erro na conexão:', error.message);
    return false;
  }
}

async function testEdgeFunction() {
  console.log('🔧 Testando Edge Function process-pending-emails...');
  
  try {
    // Teste com service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase.functions.invoke('process-pending-emails', {
      method: 'GET',
      body: {}
    });
    
    if (error) {
      console.log('❌ Erro na Edge Function:', error.message);
      return false;
    }
    
    console.log('✅ Edge Function funcionando:', data);
    return true;
  } catch (error) {
    console.log('❌ Erro na Edge Function:', error.message);
    return false;
  }
}

async function testEmailService() {
  console.log('🔧 Testando serviço de email...');
  
  try {
    // Teste com service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase.functions.invoke('send-proposal-email', {
      method: 'POST',
      body: {
        logId: 1,
        proposalId: 1,
        emailType: 'test',
        recipientEmail: 'test@example.com',
        recipientType: 'user',
        subject: 'Teste de Email',
        customerName: 'Teste',
        proposalType: 'avulsa'
      }
    });
    
    if (error) {
      console.log('❌ Erro no serviço de email:', error.message);
      return false;
    }
    
    console.log('✅ Serviço de email funcionando:', data);
    return true;
  } catch (error) {
    console.log('❌ Erro no serviço de email:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Iniciando testes das correções de autenticação...\n');
  
  const results = {
    supabase: await testSupabaseConnection(),
    edgeFunction: await testEdgeFunction(),
    emailService: await testEmailService()
  };
  
  console.log('\n📊 Resultados dos Testes:');
  console.log('========================');
  console.log(`Supabase Connection: ${results.supabase ? '✅ PASSOU' : '❌ FALHOU'}`);
  console.log(`Edge Function: ${results.edgeFunction ? '✅ PASSOU' : '❌ FALHOU'}`);
  console.log(`Email Service: ${results.emailService ? '✅ PASSOU' : '❌ FALHOU'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('✅ As correções de autenticação funcionaram!');
    console.log('✅ Os erros 401 Unauthorized foram resolvidos!');
  } else {
    console.log('\n⚠️ ALGUNS TESTES FALHARAM');
    console.log('❌ Verifique as configurações e tente novamente');
  }
  
  return allPassed;
}

// Executar testes
runTests().catch(console.error);
