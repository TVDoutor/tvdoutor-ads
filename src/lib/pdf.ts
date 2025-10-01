// src/lib/pdf.ts
// Integração frontend para geração de PDF profissional

interface PDFGenerationResponse {
  ok: boolean;
  pdf_url?: string;
  pdf_path?: string;
  error?: string;
}

// Interface para o payload completo da proposta
interface PdfProposalPayload {
  proposalId: number;
  createdAtISO: string;
  status: "Rascunho" | "Enviada" | "Em Análise" | "Aceita" | "Rejeitada";
  proposalType: string;
  project: { name: string };
  advertiser: { name: string };
  agency?: { name?: string | null; email?: string | null };
  mediaPlan: {
    filmDurationSec: number;
    insertionsPerHour: number;
    audiencePerMonth: number;
    impacts: number;
    period: { startISO: string; endISO: string; estimatedDays: number };
  };
  financial: {
    grossBRL: number;
    netBRL: number;
    totalInvestmentBRL: number;
    investmentPerScreenBRL: number;
    cpmImpactBRL: number;
    avgValuePerScreenPerDayBRL: number;
  };
  inventory: {
    totals: { screens: number; cities: number; states: number };
    byCity: Array<{ city: string; state: string; screens: number }>;
  };
  org?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    site?: string;
    stats?: {
      doctorsServed?: string;
      cfmCompliance?: string;
      patientsReached?: string;
      yearsExperience?: string;
    };
  };
}

/**
 * Constrói o payload completo da proposta para a Edge Function
 */
function buildProposalPayload(proposalData: any): PdfProposalPayload {
  // Calcular valores estimados
  const screens = proposalData.proposal_screens?.length || 0;
  const startDate = proposalData.start_date ? new Date(proposalData.start_date) : null;
  const endDate = proposalData.end_date ? new Date(proposalData.end_date) : null;
  const days = startDate && endDate ? 
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
  
  const insertionsPerHour = proposalData.insertions_per_hour || 0;
  const hoursPerDay = 10; // Assumindo 10 horas operacionais por dia
  const totalInsertions = insertionsPerHour * hoursPerDay * days * screens;
  
  const avgAudiencePerScreen = 100; // Audiência média estimada
  const impacts = totalInsertions * avgAudiencePerScreen;
  
  const cpm = proposalData.cpm_value || 25; // CPM padrão
  const grossValue = (impacts / 1000) * cpm;
  
  const discountPct = proposalData.discount_pct || 0;
  const discountFixed = proposalData.discount_fixed || 0;
  const netValue = grossValue - (grossValue * discountPct / 100) - discountFixed;

  // Agrupar telas por cidade/estado
  const cityStateGroups: { [key: string]: number } = {};
  proposalData.proposal_screens?.forEach((ps: any) => {
    if (ps.screens?.city && ps.screens?.state) {
      const key = `${ps.screens.city}/${ps.screens.state}`;
      cityStateGroups[key] = (cityStateGroups[key] || 0) + 1;
    }
  });

  const byCity = Object.entries(cityStateGroups).map(([cityState, count]) => {
    const [city, state] = cityState.split('/');
    return { city, state, screens: count };
  });

  return {
    proposalId: proposalData.id,
    createdAtISO: proposalData.created_at,
    status: proposalData.status || "Rascunho",
    proposalType: proposalData.proposal_type === 'avulsa' ? 'Campanha Avulsa' : 'Projeto Especial',
    project: {
      name: proposalData.customer_name || 'Projeto não definido'
    },
    advertiser: {
      name: proposalData.customer_name || 'Cliente não definido'
    },
    agency: {
      name: proposalData.agencias?.nome_agencia || null,
      email: proposalData.agencias?.email_empresa || proposalData.customer_email || null
    },
    mediaPlan: {
      filmDurationSec: proposalData.film_seconds || 15,
      insertionsPerHour: proposalData.insertions_per_hour || 6,
      audiencePerMonth: Math.round(impacts / (days / 30)) || 4860000,
      impacts: Math.round(impacts) || 5508000,
      period: {
        startISO: proposalData.start_date || new Date().toISOString().split('T')[0],
        endISO: proposalData.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estimatedDays: days || 34
      }
    },
    financial: {
      grossBRL: proposalData.gross_calendar || grossValue,
      netBRL: proposalData.net_calendar || netValue,
      totalInvestmentBRL: proposalData.net_calendar || netValue,
      investmentPerScreenBRL: (proposalData.net_calendar || netValue) / screens || 5100,
      cpmImpactBRL: proposalData.cpm_value || 25,
      avgValuePerScreenPerDayBRL: (proposalData.gross_calendar || grossValue) / days / screens || 150
    },
    inventory: {
      totals: {
        screens: screens,
        cities: new Set(proposalData.proposal_screens?.map((ps: any) => ps.screens?.city)).size || 6,
        states: new Set(proposalData.proposal_screens?.map((ps: any) => ps.screens?.state)).size || 1
      },
      byCity: byCity
    },
    org: {
      name: "TV Doutor ADS",
      phone: "+55 (11) 9999-9999",
      email: "contato@tvdoutorads.com.br",
      address: "São Paulo - SP - Brasil",
      site: "https://tvdoutor.com.br",
      stats: {
        doctorsServed: "5000+",
        cfmCompliance: "100%",
        patientsReached: "50M+",
        yearsExperience: "10+"
      }
    }
  };
}

/**
 * Gera PDF básico de proposta usando a Edge Function simples
 * @param proposalId - ID da proposta
 * @returns Promise com resultado da geração
 */
export async function generateBasicPDF(proposalId: number): Promise<PDFGenerationResponse> {
  try {
    console.log('🚀 Iniciando geração de PDF básico para proposta:', proposalId);
    
    // Importar o cliente Supabase
    const { supabase } = await import('@/integrations/supabase/client');
    
    console.log('📡 Chamando Edge Function generate-pdf-proposal (PDF básico)...');
    
    // Usar o cliente Supabase para chamar a Edge Function BÁSICA
    const { data, error } = await supabase.functions.invoke('generate-pdf-proposal', {
      body: {
        proposalId: proposalId
      }
    });

    console.log('📊 Resposta da Edge Function:', { data, error });

    if (error) {
      console.error('❌ Erro na Edge Function:', error);
      return {
        ok: false,
        error: error.message || 'Erro ao gerar PDF básico'
      };
    }

    if (!data || !data.ok) {
      console.warn('⚠️ Edge Function retornou erro. Data:', data);
      return {
        ok: false,
        error: data?.error || 'Erro na geração do PDF básico'
      };
    }

    console.log('✅ PDF básico gerado com sucesso!');
    return data as PDFGenerationResponse;
    
  } catch (error) {
    console.error('💥 Erro na geração do PDF básico:', error);
    return {
      ok: false,
      error: 'Erro interno na geração do PDF básico'
    };
  }
}

/**
 * Gera PDF profissional de proposta usando a Edge Function
 * @param proposalId - ID da proposta
 * @param logoUrl - URL do logo da organização (opcional)
 * @returns Promise com resultado da geração
 */
export async function generateProPDF(proposalId: number, logoUrl?: string): Promise<PDFGenerationResponse> {
  try {
    console.log('🚀 Iniciando geração de PDF profissional para proposta:', proposalId);
    
    // Importar o cliente Supabase para buscar dados completos da proposta
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Buscar dados completos da proposta
    console.log('📊 Buscando dados completos da proposta...');
    const { data: proposalData, error: fetchError } = await supabase
      .from('proposals')
      .select(`
        *,
        agencias (
          id,
          nome_agencia,
          email_empresa,
          telefone_empresa
        ),
        proposal_screens (
          id,
          screen_id,
          custom_cpm,
          screens (
            id,
            name,
            city,
            state,
            class,
            venue_id,
            venues (
              name,
              type
            )
          )
        )
      `)
      .eq('id', proposalId)
      .single();

    if (fetchError || !proposalData) {
      console.error('❌ Erro ao buscar dados da proposta:', fetchError);
      return await generateBasicPDFFallback(proposalId);
    }

    // Construir payload completo
    const payload = buildProposalPayload(proposalData);
    console.log('📋 Payload construído:', payload);
    
    console.log('📡 Chamando Edge Function pdf-proposal-pro (PDF completo)...');
    
    // Usar o cliente Supabase para chamar a Edge Function PROFISSIONAL
    const { data, error } = await supabase.functions.invoke('pdf-proposal-pro', {
      body: {
        proposalId: proposalId
      }
    });

    console.log('📊 Resposta da Edge Function:', { data, error });

    if (error) {
      console.error('❌ Erro na Edge Function:', error);
      console.log('🔄 Usando fallback: PDF básico');
      // Fallback: gerar PDF básico no frontend
      return await generateBasicPDFFallback(proposalId);
    }

    if (!data || !data.ok) {
      console.warn('⚠️ Edge Function retornou erro, usando fallback. Data:', data);
      // Fallback: gerar PDF básico no frontend
      return await generateBasicPDFFallback(proposalId);
    }

    console.log('✅ PDF profissional gerado com sucesso!');
    return data as PDFGenerationResponse;
    
  } catch (error) {
    console.error('💥 Erro na geração do PDF profissional:', error);
    console.log('🔄 Usando fallback: PDF básico');
    // Fallback: gerar PDF básico no frontend
    return await generateBasicPDFFallback(proposalId);
  }
}

/**
 * Fallback: Gera um PDF básico no frontend quando a Edge Function falha
 */
async function generateBasicPDFFallback(proposalId: number): Promise<PDFGenerationResponse> {
  try {
    // Importar jsPDF dinamicamente
    const { jsPDF } = await import('jspdf');
    
    // Criar novo documento PDF
    const doc = new jsPDF();
    
    // Adicionar conteúdo básico
    doc.setFontSize(20);
    doc.text('TV Doutor ADS', 20, 30);
    
    doc.setFontSize(16);
    doc.text('Proposta Comercial', 20, 50);
    
    doc.setFontSize(12);
    doc.text(`ID da Proposta: ${proposalId}`, 20, 70);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 80);
    
    doc.text('Esta é uma versão básica do PDF.', 20, 100);
    doc.text('Para uma versão completa, entre em contato com o suporte.', 20, 110);
    
    // Gerar blob URL
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    return {
      ok: true,
      pdf_url: pdfUrl,
      pdf_path: `proposta-${proposalId}-basica.pdf`
    };
    
  } catch (error) {
    console.error('Erro no fallback de PDF:', error);
    return {
      ok: false,
      error: 'Não foi possível gerar o PDF. Tente novamente mais tarde.'
    };
  }
}

/**
 * Hook React para geração de PDF com estado
 * @deprecated Usar diretamente a função generateProPDF
 */
export function usePDFGeneration() {
  // Removido para evitar dependência do React neste arquivo .ts
  // Use generateProPDF diretamente nos componentes
  return {
    generatePDF: generateProPDF,
    loading: false,
    error: null
  };
}

/**
 * Utilitário para abrir PDF em nova aba
 */
export function openPDF(pdfUrl: string, filename?: string) {
  const link = document.createElement('a');
  link.href = pdfUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  
  if (filename) {
    link.download = filename;
  }
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Componente JSX movido para arquivo separado se necessário
// Use generateProPDF e openPDF diretamente nos componentes React
