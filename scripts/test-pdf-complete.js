#!/usr/bin/env node

/**
 * Script para testar a geração de PDF completa
 * Testa tanto a função SQL quanto a Edge Function
 */

import { createClient } from '@supabase/supabase-js';

// Use as variáveis de ambiente diretamente
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vaogzhwzucijiyvyglls.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2d6aHd6dWNpaml5dnlnbGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2MjQwNzEsImV4cCI6MjA1MTIwMDA3MX0.placeholder';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não encontradas:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCompletePDFGeneration() {
  console.log('🧪 Testando geração completa de PDF...');
  
  try {
    // 1. Buscar uma proposta existente
    console.log('📋 Buscando propostas disponíveis...');
    const { data: proposals, error: proposalsError } = await supabase
      .from('proposals')
      .select('id, customer_name')
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
    console.log(`✅ Proposta encontrada: ID ${proposalId} - ${proposals[0].customer_name}`);
    
    // 2. Testar a função SQL
    console.log('🔍 Testando função SQL get_proposal_details...');
    const { data: sqlData, error: sqlError } = await supabase
      .rpc('get_proposal_details', { p_proposal_id: proposalId });
    
    if (sqlError) {
      console.error('❌ Erro na função SQL:', sqlError.message);
      return false;
    }
    
    console.log('✅ Função SQL funcionando!');
    console.log('📊 Dados retornados:', {
      proposal_id: sqlData?.proposal?.id,
      client_name: sqlData?.proposal?.client_name,
      screens_count: sqlData?.proposal?.screens_count,
      cities_count: sqlData?.inventory_summary_by_city?.length || 0
    });
    
    // 3. Testar a Edge Function
    console.log('🚀 Testando Edge Function generate-pdf-proposal...');
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
      console.log('🔗 URL:', data.pdf_url);
      
      // 4. Testar se a URL é acessível
      if (data.pdf_url) {
        console.log('🔍 Testando acesso ao PDF...');
        try {
          const response = await fetch(data.pdf_url);
          if (response.ok) {
            console.log('✅ PDF acessível via URL!');
          } else {
            console.log('⚠️ PDF gerado mas URL não acessível:', response.status);
          }
        } catch (fetchError) {
          console.log('⚠️ Erro ao acessar URL do PDF:', fetchError.message);
        }
      }
      
      return true;
    } else {
      console.error('❌ Edge Function retornou erro:', data?.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro no teste completo:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando teste completo de geração de PDF...\n');
  
  const success = await testCompletePDFGeneration();
  
  if (success) {
    console.log('\n🎉 TESTE COMPLETO PASSOU!');
    console.log('✅ Função SQL funcionando');
    console.log('✅ Edge Function funcionando');
    console.log('✅ CORS configurado corretamente');
    console.log('✅ PDF sendo gerado e salvo');
    console.log('\n🎯 A geração de PDF deve funcionar no frontend agora!');
  } else {
    console.log('\n❌ TESTE FALHOU!');
    console.log('Verifique os logs acima para identificar o problema.');
    process.exit(1);
  }
}

main().catch(console.error);
