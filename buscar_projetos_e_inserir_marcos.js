// Script para buscar projetos e inserir marcos
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function buscarProjetosEInserirMarcos() {
  try {
    console.log('🔍 Buscando projetos existentes...');
    
    // Buscar todos os projetos
    const { data: projetos, error: errorProjetos } = await supabase
      .from('agencia_projetos')
      .select('id, nome_projeto, status_projeto')
      .order('created_at', { ascending: false });

    if (errorProjetos) {
      console.error('❌ Erro ao buscar projetos:', errorProjetos);
      return;
    }

    if (!projetos || projetos.length === 0) {
      console.log('⚠️ Nenhum projeto encontrado no banco de dados');
      return;
    }

    console.log(`✅ Encontrados ${projetos.length} projeto(s):`);
    projetos.forEach((projeto, index) => {
      console.log(`${index + 1}. ID: ${projeto.id} | Nome: ${projeto.nome_projeto} | Status: ${projeto.status_projeto}`);
    });

    // Usar o primeiro projeto encontrado (mais recente)
    const projetoSelecionado = projetos[0];
    console.log(`\n🎯 Usando projeto: ${projetoSelecionado.nome_projeto} (ID: ${projetoSelecionado.id})`);

    // Verificar se já existem marcos para este projeto
    const { data: marcosExistentes, error: errorMarcos } = await supabase
      .from('agencia_projeto_marcos')
      .select('id, nome_marco, ordem')
      .eq('projeto_id', projetoSelecionado.id);

    if (errorMarcos) {
      console.error('❌ Erro ao verificar marcos existentes:', errorMarcos);
      return;
    }

    if (marcosExistentes && marcosExistentes.length > 0) {
      console.log(`⚠️ Já existem ${marcosExistentes.length} marco(s) para este projeto:`);
      marcosExistentes.forEach(marco => {
        console.log(`- ${marco.ordem}. ${marco.nome_marco}`);
      });
      
      const resposta = await prompt('Deseja continuar e adicionar novos marcos? (s/n): ');
      if (resposta.toLowerCase() !== 's' && resposta.toLowerCase() !== 'sim') {
        console.log('❌ Operação cancelada pelo usuário');
        return;
      }
    }

    // Inserir os marcos
    const marcos = [
      {
        projeto_id: projetoSelecionado.id,
        nome_marco: 'Kick-off e Aprovação do Briefing',
        data_prevista: '2025-09-15',
        status: 'pendente',
        ordem: 1
      },
      {
        projeto_id: projetoSelecionado.id,
        nome_marco: 'Aprovação das Peças Criativas',
        data_prevista: '2025-09-30',
        status: 'pendente',
        ordem: 2
      },
      {
        projeto_id: projetoSelecionado.id,
        nome_marco: 'Publicação da Campanha',
        data_prevista: '2025-11-01',
        status: 'pendente',
        ordem: 3
      },
      {
        projeto_id: projetoSelecionado.id,
        nome_marco: 'Relatório Final e Encerramento',
        data_prevista: '2025-12-05',
        status: 'pendente',
        ordem: 4
      }
    ];

    console.log('\n📝 Inserindo marcos...');
    
    const { data: marcosInseridos, error: errorInsercao } = await supabase
      .from('agencia_projeto_marcos')
      .insert(marcos)
      .select();

    if (errorInsercao) {
      console.error('❌ Erro ao inserir marcos:', errorInsercao);
      return;
    }

    console.log('✅ Marcos inseridos com sucesso!');
    marcosInseridos.forEach(marco => {
      console.log(`- ${marco.ordem}. ${marco.nome_marco} (${marco.data_prevista})`);
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Função auxiliar para prompt (simulação simples)
function prompt(question) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Executar o script
buscarProjetosEInserirMarcos();

