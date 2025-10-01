#!/usr/bin/env node

/**
 * Script para testar a correção do PDF completo
 * Verifica se o botão "Gerar PDF Completo" está chamando a Edge Function correta
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (usar variáveis de ambiente)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPDFCompleteGeneration() {
  console.log('🧪 Testando geração de PDF completo...\n');

  try {
    // 1. Buscar uma proposta existente para teste
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

    // 2. Testar a Edge Function pdf-proposal-pro (PDF completo)
    console.log('🚀 Testando Edge Function pdf-proposal-pro (PDF completo)...');
    const { data: proData, error: proError } = await supabase.functions.invoke('pdf-proposal-pro', {
      body: { proposalId: testProposal.id }
    });

    if (proError) {
      console.error('❌ Erro na Edge Function pdf-proposal-pro:', proError);
    } else {
      console.log('✅ PDF completo gerado com sucesso!');
      console.log('📄 URL do PDF:', proData?.pdf_url);
      console.log('📁 Caminho:', proData?.pdf_path);
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
      console.log('📁 Caminho:', basicData?.pdf_path);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 4. Comparar os resultados
    console.log('📊 Comparação dos resultados:');
    console.log('PDF Completo (pdf-proposal-pro):', proData?.ok ? '✅ Funcionando' : '❌ Erro');
    console.log('PDF Básico (generate-pdf-proposal):', basicData?.ok ? '✅ Funcionando' : '❌ Erro');

    if (proData?.ok && basicData?.ok) {
      console.log('\n🎉 CORREÇÃO FUNCIONANDO! Ambas as funções estão operacionais.');
      console.log('📝 O botão "Gerar PDF Completo" agora deve funcionar corretamente.');
    } else {
      console.log('\n⚠️ Alguma função ainda apresenta problemas.');
    }

  } catch (error) {
    console.error('💥 Erro geral no teste:', error);
  }
}

// Executar o teste
testPDFCompleteGeneration();
