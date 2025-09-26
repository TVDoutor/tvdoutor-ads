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
    // Usar sempre o endpoint do Supabase por enquanto (devido ao CSP)
    const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
    
    const response = await fetch(`${functionsUrl}/pdf-proposal-pro`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_KEY || localStorage.getItem('sb_jwt')}`
      },
      body: JSON.stringify({ 
        proposalId, 
        logoUrl 
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json() as PDFGenerationResponse;
    
  } catch (error) {
    console.error('Erro na geração do PDF profissional:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
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
