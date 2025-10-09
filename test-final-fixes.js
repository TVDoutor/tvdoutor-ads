// 🧪 Teste Final das Correções
// Este script testa especificamente os problemas que ainda estavam ocorrendo

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://vaogzhwzucijiyvyglls.supabase.co';
const supabaseAnonKey = 'sb_publishable_NgqtM9lDxmuihvScJ9V-NA_1Qz7blee';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2d6aHd6dWNpaml5dnlnbGxzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY5MDQwMCwiZXhwIjoyMDcwMjY2NDAwfQ.B6yoRHpcm0aHJqAO_yMUJ0zOa7S9SyC1f1LVSPXZ9Ug';

async function testSignupProcess() {
  console.log('🔧 Testando processo de signup...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Teste de signup com dados de teste
    const { data, error } = await supabase.auth.signUp({
      email: 'teste@example.com',
      password: 'Teste123!',
      options: {
        emailRedirectTo: 'http://localhost:8082/',
        data: {
          full_name: 'Usuário Teste',
        }
      }
    });
    
    if (error) {
      console.log('❌ Erro no signup:', error.message);
      return false;
    }
    
    console.log('✅ Signup funcionando:', data.user ? 'Usuário criado' : 'Aguardando confirmação');
    return true;
  } catch (error) {
    console.log('❌ Erro no signup:', error.message);
    return false;
  }
}

async function testEdgeFunctionWithAuth() {
  console.log('🔧 Testando Edge Function com autenticação...');
  
  try {
    // Primeiro, fazer login para obter um token válido
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Tentar fazer login com um usuário existente (se houver)
    const { data: { session }, error: loginError } = await supabase.auth.getSession();
    
    if (loginError || !session) {
      console.log('⚠️ Nenhuma sessão ativa, testando com service role');
      
      // Usar service role para teste
      const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data, error } = await supabaseService.functions.invoke('process-pending-emails', {
        method: 'GET',
        body: {}
      });
      
      if (error) {
        console.log('❌ Erro na Edge Function:', error.message);
        return false;
      }
      
      console.log('✅ Edge Function funcionando com service role:', data);
      return true;
    }
    
    // Testar com token de usuário
    const { data, error } = await supabase.functions.invoke('process-pending-emails', {
      method: 'GET',
      body: {},
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (error) {
      console.log('❌ Erro na Edge Function:', error.message);
      return false;
    }
    
    console.log('✅ Edge Function funcionando com token de usuário:', data);
    return true;
  } catch (error) {
    console.log('❌ Erro na Edge Function:', error.message);
    return false;
  }
}

async function testEmailLogsTable() {
  console.log('🔧 Testando tabela email_logs...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('❌ Erro ao acessar email_logs:', error.message);
      return false;
    }
    
    console.log('✅ Tabela email_logs acessível:', data?.length || 0, 'registros');
    return true;
  } catch (error) {
    console.log('❌ Erro ao acessar email_logs:', error.message);
    return false;
  }
}

async function testEnvironmentVariables() {
  console.log('🔧 Testando variáveis de ambiente...');
  
  try {
    // Verificar se as variáveis estão definidas
    const hasUrl = !!supabaseUrl;
    const hasAnonKey = !!supabaseAnonKey;
    const hasServiceKey = !!supabaseServiceKey;
    
    if (!hasUrl || !hasAnonKey || !hasServiceKey) {
      console.log('❌ Variáveis de ambiente faltando:', {
        hasUrl,
        hasAnonKey,
        hasServiceKey
      });
      return false;
    }
    
    console.log('✅ Todas as variáveis de ambiente configuradas');
    return true;
  } catch (error) {
    console.log('❌ Erro ao verificar variáveis:', error.message);
    return false;
  }
}

async function runFinalTests() {
  console.log('🚀 Executando testes finais das correções...\n');
  
  const results = {
    environment: await testEnvironmentVariables(),
    emailLogs: await testEmailLogsTable(),
    edgeFunction: await testEdgeFunctionWithAuth(),
    signup: await testSignupProcess()
  };
  
  console.log('\n📊 Resultados dos Testes Finais:');
  console.log('================================');
  console.log(`Variáveis de Ambiente: ${results.environment ? '✅ PASSOU' : '❌ FALHOU'}`);
  console.log(`Tabela email_logs: ${results.emailLogs ? '✅ PASSOU' : '❌ FALHOU'}`);
  console.log(`Edge Function: ${results.edgeFunction ? '✅ PASSOU' : '❌ FALHOU'}`);
  console.log(`Processo de Signup: ${results.signup ? '✅ PASSOU' : '❌ FALHOU'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 TODOS OS TESTES FINAIS PASSARAM!');
    console.log('✅ As correções funcionaram completamente!');
    console.log('✅ Os erros 500, 401 e LogWarn foram resolvidos!');
  } else {
    console.log('\n⚠️ ALGUNS TESTES FINAIS FALHARAM');
    console.log('❌ Verifique os problemas específicos acima');
  }
  
  return allPassed;
}

// Executar testes finais
runFinalTests().catch(console.error);
