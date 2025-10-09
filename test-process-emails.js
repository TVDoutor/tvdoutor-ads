// Teste da função process-pending-emails
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vaogzhwzucijiyvyglls.supabase.co';
const supabaseKey = 'sb_publishable_NgqtM9lDxmuihvScJ9V-NA_1Qz7blee';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProcessEmails() {
  console.log('🧪 Testando função process-pending-emails...');
  
  try {
    // Teste 1: GET request
    console.log('\n1. Testando GET request...');
    const { data: getData, error: getError } = await supabase.functions.invoke('process-pending-emails', {
      method: 'GET',
      body: {}
    });
    
    if (getError) {
      console.log('❌ Erro no GET:', getError);
    } else {
      console.log('✅ GET funcionando:', getData);
    }
    
    // Teste 2: POST request
    console.log('\n2. Testando POST request...');
    const { data: postData, error: postError } = await supabase.functions.invoke('process-pending-emails', {
      method: 'POST',
      body: { action: 'process' }
    });
    
    if (postError) {
      console.log('❌ Erro no POST:', postError);
    } else {
      console.log('✅ POST funcionando:', postData);
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
  }
}

testProcessEmails();
