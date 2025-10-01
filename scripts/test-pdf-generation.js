#!/usr/bin/env node

/**
 * Script para testar a geração de PDF
 * Este script testa a função SQL e a Edge Function
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSQLFunction() {
  console.log('🧪 Testando função SQL get_proposal_details...');
  
  try {
    // Buscar uma proposta existente para teste
    const { data: proposals, error: proposalsError } = await supabase
      .from('proposals')
      .select('id')
      .limit(1);
    
    if (proposalsError) {
      console.error('❌ Erro ao buscar propostas:', proposalsError.message);
      return false;
    }
    
    if (!proposals || proposals.length === 0) {
      console.log('⚠️ Nenhuma proposta encontrada para teste');
      return false;
    }
    
    const proposalId = proposals[0].id;
    console.log(`📋 Testando com proposta ID: ${proposalId}`);
    
    // Testar a função SQL
    const { data, error } = await supabase
      .rpc('get_proposal_details', { p_proposal_id: proposalId });
    
    if (error) {
      console.error('❌ Erro na função SQL:', error.message);
      return false;
    }
    
    console.log('✅ Função SQL funcionando!');
    console.log('📊 Dados retornados:', JSON.stringify(data, null, 2));
    return true;
    
  } catch (error) {
    console.error('❌ Erro no teste SQL:', error.message);
    return false;
  }
}

async function testEdgeFunction() {
  console.log('🧪 Testando Edge Function generate-pdf-proposal...');
  
  try {
    // Buscar uma proposta existente para teste
    const { data: proposals, error: proposalsError } = await supabase
      .from('proposals')
      .select('id')
      .limit(1);
    
    if (proposalsError || !proposals || proposals.length === 0) {
      console.log('⚠️ Nenhuma proposta encontrada para teste da Edge Function');
      return false;
    }
    
    const proposalId = proposals[0].id;
    console.log(`📋 Testando Edge Function com proposta ID: ${proposalId}`);
    
    // Testar a Edge Function
    const { data, error } = await supabase.functions.invoke('generate-pdf-proposal', {
      body: { proposalId }
    });
    
    if (error) {
      console.error('❌ Erro na Edge Function:', error.message);
      return false;
    }
    
    if (data && data.ok) {
      console.log('✅ Edge Function funcionando!');
      console.log('📄 PDF gerado:', data.pdf_url ? '✅' : '❌');
      console.log('📁 Caminho:', data.pdf_path);
      return true;
    } else {
      console.error('❌ Edge Function retornou erro:', data?.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro no teste da Edge Function:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando testes de geração de PDF...\n');
  
  const sqlTest = await testSQLFunction();
  console.log('');
  
  const edgeTest = await testEdgeFunction();
  console.log('');
  
  if (sqlTest && edgeTest) {
    console.log('🎉 Todos os testes passaram! A geração de PDF está funcionando.');
  } else {
    console.log('❌ Alguns testes falharam. Verifique os logs acima.');
    process.exit(1);
  }
}

main().catch(console.error);
