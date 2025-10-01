#!/usr/bin/env node

/**
 * Script para testar dados do mapa de calor
 * Verifica se há dados nas tabelas relacionadas e se a função está funcionando
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente do arquivo .env
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes
      }
    });
    return envVars;
  }
  return {};
}

const envVars = loadEnvFile();
const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', !!supabaseAnonKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testHeatmapData() {
  console.log('🔥 Testando dados do mapa de calor...\n');

  try {
    // 1. Verificar se as tabelas existem (testando diretamente)
    console.log('📊 1. Verificando existência das tabelas...');
    
    let tablesFound = [];
    
    // Testar tabela screens
    try {
      const { data: screensTest, error: screensTestError } = await supabase
        .from('screens')
        .select('id')
        .limit(1);
      if (!screensTestError) {
        tablesFound.push('screens');
      }
    } catch (e) {
      console.log('   - Tabela screens não encontrada');
    }
    
    // Testar tabela proposals
    try {
      const { data: proposalsTest, error: proposalsTestError } = await supabase
        .from('proposals')
        .select('id')
        .limit(1);
      if (!proposalsTestError) {
        tablesFound.push('proposals');
      }
    } catch (e) {
      console.log('   - Tabela proposals não encontrada');
    }
    
    // Testar tabela proposal_screens
    try {
      const { data: proposalScreensTest, error: proposalScreensTestError } = await supabase
        .from('proposal_screens')
        .select('id')
        .limit(1);
      if (!proposalScreensTestError) {
        tablesFound.push('proposal_screens');
      }
    } catch (e) {
      console.log('   - Tabela proposal_screens não encontrada');
    }
    
    console.log('✅ Tabelas encontradas:', tablesFound);

    // 2. Verificar dados nas tabelas
    console.log('\n📈 2. Verificando dados nas tabelas...');
    
    // Screens
    const { data: screens, error: screensError } = await supabase
      .from('screens')
      .select('id, name, city, lat, lng, active')
      .limit(5);

    if (screensError) {
      console.error('❌ Erro ao buscar screens:', screensError);
    } else {
      console.log(`✅ Screens: ${screens?.length || 0} registros encontrados`);
      if (screens && screens.length > 0) {
        const withCoords = screens.filter(s => s.lat && s.lng);
        console.log(`   - Com coordenadas: ${withCoords.length}`);
        console.log('   - Exemplos:', screens.slice(0, 3).map(s => `${s.name} (${s.city})`));
      }
    }

    // Proposals
    const { data: proposals, error: proposalsError } = await supabase
      .from('proposals')
      .select('id, customer_name, status, created_at')
      .limit(5);

    if (proposalsError) {
      console.error('❌ Erro ao buscar proposals:', proposalsError);
    } else {
      console.log(`✅ Proposals: ${proposals?.length || 0} registros encontrados`);
      if (proposals && proposals.length > 0) {
        console.log('   - Exemplos:', proposals.slice(0, 3).map(p => `${p.customer_name} (${p.status})`));
      }
    }

    // Proposal Screens
    const { data: proposalScreens, error: proposalScreensError } = await supabase
      .from('proposal_screens')
      .select('proposal_id, screen_id')
      .limit(10);

    if (proposalScreensError) {
      console.error('❌ Erro ao buscar proposal_screens:', proposalScreensError);
    } else {
      console.log(`✅ Proposal Screens: ${proposalScreens?.length || 0} registros encontrados`);
      if (proposalScreens && proposalScreens.length > 0) {
        console.log('   - Exemplos:', proposalScreens.slice(0, 3).map(ps => `Proposal ${ps.proposal_id} -> Screen ${ps.screen_id}`));
      }
    }

    // 3. Testar função do heatmap
    console.log('\n🔥 3. Testando função get_heatmap_data...');
    
    const { data: heatmapData, error: heatmapError } = await supabase
      .rpc('get_heatmap_data', {
        p_start_date: null,
        p_end_date: null,
        p_city: null,
        p_class: null,
        p_normalize: false
      });

    if (heatmapError) {
      console.error('❌ Erro na função get_heatmap_data:', heatmapError);
    } else {
      console.log(`✅ Heatmap data: ${heatmapData?.length || 0} pontos encontrados`);
      if (heatmapData && heatmapData.length > 0) {
        console.log('   - Exemplos:', heatmapData.slice(0, 3).map(h => 
          `${h.name} (${h.city}): ${h.proposal_count} propostas`
        ));
      }
    }

    // 4. Testar função de estatísticas
    console.log('\n📊 4. Testando função get_heatmap_stats...');
    
    const { data: stats, error: statsError } = await supabase
      .rpc('get_heatmap_stats', {
        p_start_date: null,
        p_end_date: null,
        p_city: null
      });

    if (statsError) {
      console.error('❌ Erro na função get_heatmap_stats:', statsError);
    } else {
      console.log('✅ Estatísticas do heatmap:', stats?.[0] || 'Nenhuma estatística encontrada');
    }

    // 5. Verificar se há dados suficientes para o heatmap
    console.log('\n🎯 5. Análise dos dados...');
    
    if (!proposalScreens || proposalScreens.length === 0) {
      console.log('⚠️  PROBLEMA IDENTIFICADO: Não há dados na tabela proposal_screens');
      console.log('   - Isso significa que as propostas não estão sendo associadas às telas');
      console.log('   - O mapa de calor não funcionará sem esses dados');
    } else if (!screens || screens.filter(s => s.lat && s.lng).length === 0) {
      console.log('⚠️  PROBLEMA IDENTIFICADO: Não há telas com coordenadas válidas');
      console.log('   - O mapa de calor precisa de telas com lat/lng');
    } else if (!heatmapData || heatmapData.length === 0) {
      console.log('⚠️  PROBLEMA IDENTIFICADO: Função get_heatmap_data não retorna dados');
      console.log('   - Pode ser um problema na função SQL ou nos JOINs');
    } else {
      console.log('✅ Dados parecem estar corretos para o mapa de calor');
    }

  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

// Executar teste
testHeatmapData().then(() => {
  console.log('\n🏁 Teste concluído');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
