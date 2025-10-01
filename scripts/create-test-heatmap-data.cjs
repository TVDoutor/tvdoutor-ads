#!/usr/bin/env node

/**
 * Script para criar dados de teste para o mapa de calor
 * Cria propostas e associa telas para testar o heatmap
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestData() {
  console.log('🔥 Criando dados de teste para o mapa de calor...\n');

  try {
    // 1. Verificar se há telas disponíveis
    console.log('📊 1. Verificando telas disponíveis...');
    
    const { data: screens, error: screensError } = await supabase
      .from('screens')
      .select('id, name, city, lat, lng')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .limit(10);

    if (screensError) {
      console.error('❌ Erro ao buscar telas:', screensError);
      return;
    }

    if (!screens || screens.length === 0) {
      console.error('❌ Não há telas com coordenadas válidas');
      return;
    }

    console.log(`✅ Encontradas ${screens.length} telas com coordenadas:`);
    screens.forEach(screen => {
      console.log(`   - ${screen.name} (${screen.city}) - [${screen.lat}, ${screen.lng}]`);
    });

    // 2. Criar propostas de teste
    console.log('\n📝 2. Criando propostas de teste...');
    
    const testProposals = [
      {
        customer_name: 'Cliente Teste 1',
        customer_email: 'cliente1@teste.com',
        proposal_type: 'comercial',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        impact_formula: 'cpm',
        status: 'aceita',
        insertions_per_hour: 2,
        film_seconds: 30,
        cpm_mode: 'fixed',
        cpm_value: 15.50,
        discount_pct: 10,
        discount_fixed: 0,
        net_business: 5000
      },
      {
        customer_name: 'Cliente Teste 2',
        customer_email: 'cliente2@teste.com',
        proposal_type: 'comercial',
        start_date: '2024-02-01',
        end_date: '2024-02-28',
        impact_formula: 'cpm',
        status: 'rascunho',
        insertions_per_hour: 1,
        film_seconds: 15,
        cpm_mode: 'fixed',
        cpm_value: 12.00,
        discount_pct: 5,
        discount_fixed: 100,
        net_business: 3000
      },
      {
        customer_name: 'Cliente Teste 3',
        customer_email: 'cliente3@teste.com',
        proposal_type: 'comercial',
        start_date: '2024-03-01',
        end_date: '2024-03-31',
        impact_formula: 'cpm',
        status: 'aceita',
        insertions_per_hour: 3,
        film_seconds: 45,
        cpm_mode: 'fixed',
        cpm_value: 18.75,
        discount_pct: 15,
        discount_fixed: 0,
        net_business: 7500
      }
    ];

    const createdProposals = [];

    for (const proposalData of testProposals) {
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .insert(proposalData)
        .select('id')
        .single();

      if (proposalError) {
        console.error(`❌ Erro ao criar proposta ${proposalData.customer_name}:`, proposalError);
        continue;
      }

      createdProposals.push(proposal);
      console.log(`✅ Proposta criada: ${proposalData.customer_name} (ID: ${proposal.id})`);
    }

    if (createdProposals.length === 0) {
      console.error('❌ Nenhuma proposta foi criada');
      return;
    }

    // 3. Associar telas às propostas
    console.log('\n🔗 3. Associando telas às propostas...');
    
    const proposalScreenLinks = [];

    // Proposta 1: usar 3 telas
    if (createdProposals[0]) {
      const selectedScreens1 = screens.slice(0, 3);
      for (const screen of selectedScreens1) {
        proposalScreenLinks.push({
          proposal_id: createdProposals[0].id,
          screen_id: screen.id
        });
      }
      console.log(`✅ Proposta 1 associada a ${selectedScreens1.length} telas`);
    }

    // Proposta 2: usar 2 telas (incluindo 1 repetida)
    if (createdProposals[1]) {
      const selectedScreens2 = [screens[0], screens[3]]; // Tela 0 repetida, tela 3 nova
      for (const screen of selectedScreens2) {
        proposalScreenLinks.push({
          proposal_id: createdProposals[1].id,
          screen_id: screen.id
        });
      }
      console.log(`✅ Proposta 2 associada a ${selectedScreens2.length} telas`);
    }

    // Proposta 3: usar 4 telas
    if (createdProposals[2]) {
      const selectedScreens3 = screens.slice(0, 4);
      for (const screen of selectedScreens3) {
        proposalScreenLinks.push({
          proposal_id: createdProposals[2].id,
          screen_id: screen.id
        });
      }
      console.log(`✅ Proposta 3 associada a ${selectedScreens3.length} telas`);
    }

    // Inserir todas as associações
    if (proposalScreenLinks.length > 0) {
      const { error: linkError } = await supabase
        .from('proposal_screens')
        .insert(proposalScreenLinks);

      if (linkError) {
        console.error('❌ Erro ao associar telas às propostas:', linkError);
        return;
      }

      console.log(`✅ ${proposalScreenLinks.length} associações proposal_screens criadas`);
    }

    // 4. Verificar dados criados
    console.log('\n📊 4. Verificando dados criados...');
    
    const { data: finalProposals, error: finalProposalsError } = await supabase
      .from('proposals')
      .select('id, customer_name, status');

    const { data: finalProposalScreens, error: finalProposalScreensError } = await supabase
      .from('proposal_screens')
      .select('proposal_id, screen_id');

    if (finalProposalsError) {
      console.error('❌ Erro ao verificar propostas:', finalProposalsError);
    } else {
      console.log(`✅ Total de propostas: ${finalProposals?.length || 0}`);
    }

    if (finalProposalScreensError) {
      console.error('❌ Erro ao verificar proposal_screens:', finalProposalScreensError);
    } else {
      console.log(`✅ Total de associações proposal_screens: ${finalProposalScreens?.length || 0}`);
    }

    // 5. Testar função do heatmap
    console.log('\n🔥 5. Testando função do heatmap...');
    
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
        console.log('   - Exemplos:');
        heatmapData.slice(0, 3).forEach(h => {
          console.log(`     ${h.name} (${h.city}): ${h.proposal_count} propostas`);
        });
      }
    }

    console.log('\n🎉 Dados de teste criados com sucesso!');
    console.log('   - O mapa de calor agora deve funcionar corretamente');
    console.log('   - Acesse a página de relatórios para ver o heatmap');

  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

// Executar criação de dados
createTestData().then(() => {
  console.log('\n🏁 Processo concluído');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
