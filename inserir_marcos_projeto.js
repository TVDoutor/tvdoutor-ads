// Script para inserir marcos do projeto
// Execute este script no console do navegador na página da aplicação

console.log('🚀 Iniciando inserção de marcos do projeto...');

// Função para inserir marcos
async function inserirMarcosProjeto() {
  try {
    // Importar o cliente Supabase (assumindo que está disponível globalmente)
    if (typeof window === 'undefined' || !window.supabase) {
      console.error('❌ Cliente Supabase não encontrado. Execute este script na página da aplicação.');
      return;
    }

    const supabase = window.supabase;

    // Buscar projetos existentes
    console.log('🔍 Buscando projetos existentes...');
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

    // Verificar marcos existentes
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
    }

    // Definir os marcos a serem inseridos
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

    console.log('\n🎉 Operação concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar a função
inserirMarcosProjeto();

