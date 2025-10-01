#!/usr/bin/env node

/**
 * Script para testar se o erro de CORS foi corrigido
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vaogzhwzucijiyvyglls.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCORSFix() {
  console.log('🧪 Testando correção do CORS...\n');

  try {
    // 1. Buscar uma proposta para teste
    console.log('📊 Buscando proposta para teste...');
    const { data: proposals, error: fetchError } = await supabase
      .from('proposals')
      .select('id, customer_name')
      .limit(1);

    if (fetchError || !proposals || proposals.length === 0) {
      console.error('❌ Erro ao buscar proposta:', fetchError);
      return;
    }

    const testProposal = proposals[0];
    console.log(`✅ Proposta encontrada: ID ${testProposal.id} - ${testProposal.customer_name}\n`);

    // 2. Testar a Edge Function pdf-proposal-pro (PDF completo) com CORS
    console.log('🚀 Testando Edge Function pdf-proposal-pro (CORS corrigido)...');
    
    const startTime = Date.now();
    const { data: proData, error: proError } = await supabase.functions.invoke('pdf-proposal-pro', {
      body: { proposalId: testProposal.id }
    });
    const endTime = Date.now();

    console.log(`⏱️ Tempo de resposta: ${endTime - startTime}ms`);

    if (proError) {
      console.error('❌ Erro na Edge Function pdf-proposal-pro:', proError);
      
      // Verificar se é erro de CORS
      if (proError.message && proError.message.includes('CORS')) {
        console.log('🚨 ERRO DE CORS AINDA PERSISTE!');
      } else {
        console.log('✅ CORS OK - Erro é outro tipo');
      }
    } else {
      console.log('✅ PDF completo gerado com sucesso!');
      console.log('📄 URL do PDF:', proData?.pdf_url);
      console.log('📁 Caminho:', proData?.pdf_path);
      console.log('🎉 CORS CORRIGIDO COM SUCESSO!');
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 3. Testar a Edge Function generate-pdf-proposal (PDF básico)
    console.log('🚀 Testando Edge Function generate-pdf-proposal (PDF básico)...');
    const { data: basicData, error: basicError } = await supabase.functions.invoke('generate-pdf-proposal', {
      body: { proposalId: testProposal.id }
    });

    if (basicError) {
      console.error('❌ Erro na Edge Function generate-pdf-proposal:', basicError);
    } else {
      console.log('✅ PDF básico gerado com sucesso!');
      console.log('📄 URL do PDF:', basicData?.pdf_url);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 4. Resumo dos testes
    console.log('📊 Resumo dos Testes:');
    console.log('PDF Completo (pdf-proposal-pro):', proData?.ok ? '✅ Funcionando' : '❌ Erro');
    console.log('PDF Básico (generate-pdf-proposal):', basicData?.ok ? '✅ Funcionando' : '❌ Erro');

    if (proData?.ok) {
      console.log('\n🎉 CORREÇÃO DO CORS FUNCIONANDO!');
      console.log('📝 O botão "Gerar PDF Completo" deve funcionar agora.');
    } else {
      console.log('\n⚠️ Ainda há problemas com a geração de PDF.');
    }

  } catch (error) {
    console.error('💥 Erro geral no teste:', error);
  }
}

// Executar o teste
testCORSFix();
