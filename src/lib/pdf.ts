// src/lib/pdf.ts
// Integração frontend para geração de PDF profissional

interface PDFGenerationResponse {
  ok: boolean;
  pdf_url?: string;
  pdf_path?: string;
  error?: string;
}

/**
 * Gera PDF profissional de proposta usando a Edge Function
 * @param proposalId - ID da proposta
 * @param logoUrl - URL do logo da organização (opcional)
 * @returns Promise com resultado da geração
 */
export async function generateProPDF(proposalId: number, logoUrl?: string): Promise<PDFGenerationResponse> {
  try {
    // Importar o cliente Supabase para usar as Edge Functions
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Usar o cliente Supabase para chamar a Edge Function
    const { data, error } = await supabase.functions.invoke('pdf-proposal-pro', {
      body: { 
        proposalId, 
        logoUrl 
      }
    });

    if (error) {
      console.error('Erro na Edge Function:', error);
      // Fallback: gerar PDF básico no frontend
      return await generateBasicPDF(proposalId);
    }

    if (!data || !data.ok) {
      console.warn('Edge Function retornou erro, usando fallback');
      // Fallback: gerar PDF básico no frontend
      return await generateBasicPDF(proposalId);
    }

    return data as PDFGenerationResponse;
    
  } catch (error) {
    console.error('Erro na geração do PDF profissional:', error);
    // Fallback: gerar PDF básico no frontend
    return await generateBasicPDF(proposalId);
  }
}

/**
 * Fallback: Gera um PDF básico no frontend quando a Edge Function falha
 */
async function generateBasicPDF(proposalId: number): Promise<PDFGenerationResponse> {
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
