// Teste da estrutura do banco de dados
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vaogzhwzucijiyvyglls.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2d6aHd6dWNpaml5dnlnbGxzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY5MDQwMCwiZXhwIjoyMDcwMjY2NDAwfQ.B6yoRHpcm0aHJqAO_yMUJ0zOa7S9SyC1f1LVSPXZ9Ug';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseStructure() {
  console.log('🧪 Testando estrutura do banco de dados...');
  
  try {
    // Teste 1: Verificar se a tabela profiles existe
    console.log('\n1. Verificando tabela profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ Erro ao acessar profiles:', profilesError.message);
    } else {
      console.log('✅ Tabela profiles acessível');
    }
    
    // Teste 2: Verificar se a tabela user_roles existe
    console.log('\n2. Verificando tabela user_roles...');
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(1);
    
    if (userRolesError) {
      console.log('❌ Erro ao acessar user_roles:', userRolesError.message);
    } else {
      console.log('✅ Tabela user_roles acessível');
    }
    
    // Teste 3: Verificar se a tabela email_logs existe
    console.log('\n3. Verificando tabela email_logs...');
    const { data: emailLogs, error: emailLogsError } = await supabase
      .from('email_logs')
      .select('*')
      .limit(1);
    
    if (emailLogsError) {
      console.log('❌ Erro ao acessar email_logs:', emailLogsError.message);
    } else {
      console.log('✅ Tabela email_logs acessível');
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
  }
}

testDatabaseStructure();
