import { createClient } from '@supabase/supabase-js';

console.log('🧪 Teste Produção - TV Doutor ADS');

const supabase = createClient(
  'https://vaogzhwzucijiyvyglls.supabase.co',
  'sb_publishable_NgqtM9lDxmuihvScJ9V-NA_1Qz7blee'
);

async function test() {
  try {
    console.log('📧 Testando cadastro...');
    
    const { data, error } = await supabase.auth.signUp({
      email: `teste-${Date.now()}@tvdoutor.com.br`,
      password: 'Teste@2025!',
      options: {
        data: { full_name: 'Teste Produção' }
      }
    });

    if (error) {
      console.error('❌ Erro:', error.message);
      return false;
    }

    console.log('✅ Sucesso! User ID:', data.user?.id);
    return true;

  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

test().then(success => {
  console.log('📊 Resultado:', success ? '✅ PASSOU' : '❌ FALHOU');
  process.exit(success ? 0 : 1);
});

