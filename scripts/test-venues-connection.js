// Script para testar a conexão com o Supabase e a busca de pontos de venda
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase (usar as mesmas do projeto)
const SUPABASE_URL = 'https://vaogzhwzucijiyvyglls.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2d6aHd6dWNpaml5dnlnbGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2MjQwNzEsImV4cCI6MjA1MTIwMDA3MX0.placeholder';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🔄 Testando conexão com Supabase...');
  
  try {
    // Teste 1: Verificar se consegue conectar
    console.log('1. Testando conexão básica...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('⚠️ Erro de autenticação (pode ser normal):', authError.message);
    } else {
      console.log('✅ Conexão básica OK');
    }
    
    // Teste 2: Verificar se a tabela screens existe
    console.log('2. Testando acesso à tabela screens...');
    const { data: screensData, error: screensError } = await supabase
      .from('screens')
      .select('id, code, name')
      .limit(1);
    
    if (screensError) {
      console.error('❌ Erro ao acessar tabela screens:', screensError);
    } else {
      console.log('✅ Tabela screens acessível');
      console.log('📊 Exemplo de tela:', screensData?.[0] || 'Nenhuma tela encontrada');
    }
    
    // Teste 3: Verificar se a view v_screens_enriched existe
    console.log('3. Testando acesso à view v_screens_enriched...');
    const { data: viewData, error: viewError } = await supabase
      .from('v_screens_enriched')
      .select('id, code, name')
      .limit(1);
    
    if (viewError) {
      console.error('❌ Erro ao acessar view v_screens_enriched:', viewError);
    } else {
      console.log('✅ View v_screens_enriched acessível');
      console.log('📊 Exemplo da view:', viewData?.[0] || 'Nenhum dado encontrado');
    }
    
    // Teste 4: Contar total de telas
    console.log('4. Contando total de telas...');
    const { count, error: countError } = await supabase
      .from('screens')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Erro ao contar telas:', countError);
    } else {
      console.log(`✅ Total de telas na tabela: ${count || 0}`);
    }
    
    // Teste 5: Buscar telas com coordenadas (como na função fetchAllScreens)
    console.log('5. Testando busca de telas com coordenadas...');
    const { data: coordsData, error: coordsError } = await supabase
      .from('screens')
      .select('id, code, name, city, state, lat, lng, active')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .limit(5);
    
    if (coordsError) {
      console.error('❌ Erro ao buscar telas com coordenadas:', coordsError);
    } else {
      console.log(`✅ Telas com coordenadas encontradas: ${coordsData?.length || 0}`);
      if (coordsData && coordsData.length > 0) {
        console.log('📊 Exemplo:', coordsData[0]);
      }
    }
    
    console.log('\n🎉 Teste de conexão concluído!');
    
  } catch (error) {
    console.error('💥 Erro geral no teste:', error);
  }
}

// Executar o teste
testConnection();
