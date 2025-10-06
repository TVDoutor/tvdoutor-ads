#!/usr/bin/env node

/**
 * Teste Simples de Cadastro de Usuários
 */

import { createClient } from '@supabase/supabase-js';

console.log('🧪 Teste de Cadastro - TV Doutor ADS');
console.log('====================================');

// Configuração local
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSignup() {
  try {
    console.log('📧 Testando cadastro...');
    
    const testEmail = `teste-${Date.now()}@exemplo.com`;
    console.log(`Email: ${testEmail}`);
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'Teste@2025!',
      options: {
        data: {
          full_name: 'Usuário Teste',
        }
      }
    });

    if (error) {
      console.error('❌ Erro:', error.message);
      return false;
    }

    console.log('✅ Cadastro realizado!');
    console.log('User ID:', data.user?.id);
    return true;

  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    return false;
  }
}

// Executar teste
testSignup().then(success => {
  console.log('\n📊 Resultado:', success ? '✅ SUCESSO' : '❌ FALHA');
  process.exit(success ? 0 : 1);
});
