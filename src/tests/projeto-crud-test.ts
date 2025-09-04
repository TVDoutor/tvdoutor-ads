// Teste manual das funcionalidades CRUD de projetos
// Este arquivo pode ser executado no console do navegador para testar as validações

import { validateProjeto, sanitizeProjeto } from '../utils/validations/projeto-validations';
import { criarProjeto, atualizarProjeto, excluirProjeto } from '../lib/agencia-service';

// Dados de teste válidos
const dadosValidos = {
  nome_projeto: 'Projeto Teste Validação',
  descricao: 'Descrição do projeto de teste para validações',
  data_inicio: '2024-01-15',
  data_fim: '2024-06-30',
  deal_id: '123e4567-e89b-12d3-a456-426614174000', // UUID de exemplo
  status_projeto: 'planejamento' as const,
  orcamento_projeto: '50000.00',
  responsavel_projeto: '987fcdeb-51a2-43d1-b789-123456789abc', // UUID de exemplo
  observacoes: 'Observações do projeto de teste',
  prioridade: 'alta' as const,
  tipo_projeto: 'campanha' as const
};

// Dados de teste inválidos
const dadosInvalidos = {
  nome_projeto: 'AB', // Muito curto
  descricao: 'A'.repeat(1001), // Muito longo
  data_inicio: 'data-inválida',
  data_fim: '2023-01-01', // Data no passado
  deal_id: 'uuid-inválido',
  status_projeto: 'status_inexistente' as any,
  orcamento_projeto: '-1000', // Valor negativo
  responsavel_projeto: 'uuid-inválido',
  observacoes: 'A'.repeat(2001), // Muito longo
  prioridade: 'prioridade_inexistente' as any,
  tipo_projeto: 'tipo_inexistente' as any
};

// Função para testar validações
export const testarValidacoes = () => {
  console.log('🧪 Iniciando testes de validação...');
  
  // Teste 1: Dados válidos
  console.log('\n📋 Teste 1: Validação com dados válidos');
  const resultadoValido = validateProjeto(dadosValidos);
  console.log('Resultado:', resultadoValido);
  
  if (resultadoValido.success) {
    console.log('✅ Dados válidos passaram na validação');
  } else {
    console.log('❌ Dados válidos falharam na validação:', resultadoValido.errors);
  }
  
  // Teste 2: Dados inválidos
  console.log('\n📋 Teste 2: Validação com dados inválidos');
  const resultadoInvalido = validateProjeto(dadosInvalidos);
  console.log('Resultado:', resultadoInvalido);
  
  if (!resultadoInvalido.success) {
    console.log('✅ Dados inválidos foram rejeitados corretamente');
    console.log('Erros encontrados:', resultadoInvalido.errors);
  } else {
    console.log('❌ Dados inválidos passaram na validação (erro!)');
  }
  
  // Teste 3: Sanitização
  console.log('\n📋 Teste 3: Sanitização de dados');
  const dadosComEspacos = {
    ...dadosValidos,
    nome_projeto: '  Projeto   com   espaços   ',
    descricao: '\n\nDescrição\ncom\nquebras\n\n',
    orcamento_projeto: '  50000.123456  '
  };
  
  const dadosSanitizados = sanitizeProjeto(dadosComEspacos);
  console.log('Dados originais:', dadosComEspacos);
  console.log('Dados sanitizados:', dadosSanitizados);
  
  // Teste 4: Validação de datas
  console.log('\n📋 Teste 4: Validação de datas');
  const dadosDataInvalida = {
    ...dadosValidos,
    data_inicio: '2024-06-30',
    data_fim: '2024-01-15' // Data fim antes do início
  };
  
  const resultadoData = validateProjeto(dadosDataInvalida);
  console.log('Teste data fim antes do início:', resultadoData);
  
  console.log('\n🎉 Testes de validação concluídos!');
};

// Função para testar operações CRUD (requer conexão com Supabase)
export const testarCRUD = async () => {
  console.log('🔧 Iniciando testes CRUD...');
  
  try {
    // Teste de criação
    console.log('\n📋 Teste: Criar projeto');
    const projetoCriado = await criarProjeto(dadosValidos);
    console.log('✅ Projeto criado:', projetoCriado);
    
    // Teste de atualização
    console.log('\n📋 Teste: Atualizar projeto');
    const dadosAtualizacao = {
      ...dadosValidos,
      nome_projeto: 'Projeto Atualizado',
      status_projeto: 'em_andamento' as const
    };
    
    const projetoAtualizado = await atualizarProjeto(projetoCriado.id, dadosAtualizacao);
    console.log('✅ Projeto atualizado:', projetoAtualizado);
    
    // Teste de exclusão
    console.log('\n📋 Teste: Excluir projeto');
    const resultadoExclusao = await excluirProjeto(projetoCriado.id);
    console.log('✅ Projeto excluído:', resultadoExclusao);
    
    console.log('\n🎉 Testes CRUD concluídos com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro nos testes CRUD:', error);
  }
};

// Função para testar casos extremos
export const testarCasosExtremos = () => {
  console.log('🔍 Iniciando testes de casos extremos...');
  
  const casosExtremos = [
    {
      nome: 'String vazia',
      dados: { ...dadosValidos, nome_projeto: '' }
    },
    {
      nome: 'Apenas espaços',
      dados: { ...dadosValidos, nome_projeto: '   ' }
    },
    {
      nome: 'Caracteres especiais',
      dados: { ...dadosValidos, nome_projeto: '<script>alert("xss")</script>' }
    },
    {
      nome: 'Orçamento muito grande',
      dados: { ...dadosValidos, orcamento_projeto: '999999999999999' }
    },
    {
      nome: 'UUID malformado',
      dados: { ...dadosValidos, deal_id: 'não-é-uuid' }
    },
    {
      nome: 'Data no futuro distante',
      dados: { ...dadosValidos, data_inicio: '2050-01-01' }
    }
  ];
  
  casosExtremos.forEach((caso, index) => {
    console.log(`\n📋 Teste ${index + 1}: ${caso.nome}`);
    const resultado = validateProjeto(caso.dados);
    
    if (resultado.success) {
      console.log('⚠️  Caso extremo passou na validação (pode ser problema)');
    } else {
      console.log('✅ Caso extremo rejeitado corretamente');
      console.log('Erros:', resultado.errors);
    }
  });
  
  console.log('\n🎉 Testes de casos extremos concluídos!');
};

// Função principal para executar todos os testes
export const executarTodosTestes = async () => {
  console.log('🚀 Executando bateria completa de testes...');
  
  testarValidacoes();
  testarCasosExtremos();
  
  // Testes CRUD só se houver conexão com Supabase
  try {
    await testarCRUD();
  } catch (error) {
    console.log('⚠️  Testes CRUD pulados (sem conexão com Supabase)');
  }
  
  console.log('\n🏁 Todos os testes concluídos!');
};

// Exportar para uso no console do navegador
if (typeof window !== 'undefined') {
  (window as any).projetoTests = {
    testarValidacoes,
    testarCRUD,
    testarCasosExtremos,
    executarTodosTestes
  };
  
  console.log('🔧 Testes de projeto disponíveis no console:');
  console.log('- window.projetoTests.testarValidacoes()');
  console.log('- window.projetoTests.testarCRUD()');
  console.log('- window.projetoTests.testarCasosExtremos()');
  console.log('- window.projetoTests.executarTodosTestes()');
}