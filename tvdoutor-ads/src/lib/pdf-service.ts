// PDF Service - Captura DOM Vivo
// Abordagem: "O que você vê é o que você obtém"

import html2pdf from 'html2pdf.js';

export class PDFService {
  /**
   * Gera PDF a partir do DOM vivo da página
   * Captura exatamente o que o usuário vê na tela com formato customizado
   */
  async downloadVisibleProposalPDF(filename = 'proposta.pdf'): Promise<void> {
    console.log('🚀 Iniciando captura do DOM vivo com formato customizado...');
    
    // 1. Encontra o container principal na página
    const printArea = document.getElementById('proposal-print-area');
    
    if (!printArea) {
      console.error('❌ Elemento "proposal-print-area" não encontrado no DOM');
      throw new Error('Área de impressão não encontrada. Certifique-se de que o componente está renderizado.');
    }

    console.log('✅ Container principal encontrado:', printArea);

    // 2. Mede as dimensões reais do conteúdo
    const contentWidth = printArea.scrollWidth;
    const contentHeight = printArea.scrollHeight;
    
    console.log('📏 Dimensões do conteúdo:', {
      width: contentWidth,
      height: contentHeight
    });

    // 3. Aplicar classe de contexto para estilos específicos de PDF
    document.body.classList.add('pdf-export');

    // 4. Elementos a serem escondidos apenas durante a captura
    const elementsToHide = document.querySelectorAll('.hide-on-pdf, .pdf-download-button');
    console.log(`🔍 Encontrados ${elementsToHide.length} elementos para esconder`);

    // 5. Esconde elementos indesejados temporariamente
    const originalDisplays: string[] = [];
    elementsToHide.forEach((el, index) => {
      const element = el as HTMLElement;
      originalDisplays[index] = element.style.display;
      element.style.display = 'none';
      console.log(`👁️ Elemento ${index + 1} escondido:`, element.className);
    });

    try {
      // 6. Configurações otimizadas para A4 paginado (UX mais limpo e previsível)
      const options = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          backgroundColor: '#ffffff',
          logging: false,
        },
        pagebreak: { mode: ['css', 'legacy'], before: '.page-break-before', avoid: ['.avoid-break-inside'] },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      } as const;

      console.log('📐 Configurações do PDF customizado:', {
        scale: options.html2canvas.scale,
        contentWidth: contentWidth,
        contentHeight: contentHeight,
        format: options.jsPDF.format,
        unit: options.jsPDF.unit,
        orientation: options.jsPDF.orientation
      });

      // 7. Gera o PDF a partir do elemento visível
      console.log('📄 Iniciando conversão para PDF (A4 paginado)...');
      await html2pdf().set(options).from(printArea).save();
      
      console.log('✅ PDF gerado com sucesso no formato A4!');

    } catch (error) {
      console.error('❌ Erro durante a geração do PDF:', error);
      throw error;
    } finally {
      // 8. Restaura a visibilidade dos elementos
      elementsToHide.forEach((el, index) => {
        const element = el as HTMLElement;
        element.style.display = originalDisplays[index];
      });
      document.body.classList.remove('pdf-export');
      console.log('🔄 Elementos restaurados à visibilidade original');
    }
  }

  /**
   * Método de compatibilidade com a interface anterior
   * @deprecated Use downloadVisibleProposalPDF() em vez disso
   */
  async downloadProposalPDF(_proposalId: number, filename: string): Promise<void> {
    console.log('⚠️ Usando método legado. Considere migrar para downloadVisibleProposalPDF()');
    return this.downloadVisibleProposalPDF(filename);
  }

  /**
   * Método de compatibilidade com a interface anterior
   * @deprecated Use downloadVisibleProposalPDF() em vez disso
   */
  async generateProposalPDF(params: { proposalId: number }): Promise<Blob> {
    console.log('⚠️ Usando método legado. Considere migrar para downloadVisibleProposalPDF()');
    await this.downloadVisibleProposalPDF(`proposta-${params.proposalId}.pdf`);
    
    // Retorna um blob vazio para compatibilidade
    return new Blob([''], { type: 'application/pdf' });
  }
}

// Instância singleton
export const pdfService = new PDFService();

// Função de conveniência para uso direto
export async function downloadVisibleProposalPDF(filename = 'proposta.pdf'): Promise<void> {
  return pdfService.downloadVisibleProposalPDF(filename);
}
