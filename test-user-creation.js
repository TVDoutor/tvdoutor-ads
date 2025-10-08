// Teste de criação de usuário
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vaogzhwzucijiyvyglls.supabase.co';
const supabaseKey = 'sb_publishable_NgqtM9lDxmuihvScJ9V-NA_1Qz7blee';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserCreation() {
  console.log('🧪 Testando criação de usuário...');
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'teste@example.com',
      password: 'testpassword123',
      options: {
        data: {
          full_name: 'Teste User'
        }
      }
    });
    
    if (error) {
      console.log('❌ Erro na criação:', error);
    } else {
      console.log('✅ Usuário criado:', data);
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
  }
}

testUserCreation();
