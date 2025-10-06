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

    // 3. Elementos a serem escondidos apenas durante a captura
    const elementsToHide = document.querySelectorAll('.hide-on-pdf, .pdf-download-button');
    console.log(`🔍 Encontrados ${elementsToHide.length} elementos para esconder`);

    // 4. Esconde elementos indesejados temporariamente
    const originalDisplays: string[] = [];
    elementsToHide.forEach((el, index) => {
      const element = el as HTMLElement;
      originalDisplays[index] = element.style.display;
      element.style.display = 'none';
      console.log(`👁️ Elemento ${index + 1} escondido:`, element.className);
    });

    try {
      // 5. Configurações otimizadas para formato customizado
        const options = {
        margin: 0, // A margem será controlada pelo CSS do printArea
          filename: filename,
          image: { 
            type: 'jpeg', 
          quality: 1.0 // Qualidade máxima
          },
          html2canvas: { 
          scale: 2, // Mantenha a alta resolução
            useCORS: true,
            letterRendering: true,
            backgroundColor: '#ffffff',
          logging: false,
          width: contentWidth,
          height: contentHeight,
            scrollX: 0,
            scrollY: 0
          },
        // --- A MUDANÇA PRINCIPAL ESTÁ AQUI ---
          jsPDF: { 
          unit: 'px', // Trabalhar com pixels para correspondência 1:1
          format: [contentWidth, contentHeight], // Cria uma página com o tamanho exato do conteúdo
          orientation: 'portrait'
        }
      };

      console.log('📐 Configurações do PDF customizado:', {
        scale: options.html2canvas.scale,
        contentWidth: contentWidth,
        contentHeight: contentHeight,
        format: options.jsPDF.format,
        unit: options.jsPDF.unit
      });

      // 6. Gera o PDF a partir do elemento visível
      console.log('📄 Iniciando conversão para PDF com formato customizado...');
      await html2pdf().set(options).from(printArea).save();
      
      console.log('✅ PDF gerado com sucesso usando formato customizado!');

    } catch (error) {
      console.error('❌ Erro durante a geração do PDF:', error);
      throw error;
    } finally {
      // 7. Restaura a visibilidade dos elementos
      elementsToHide.forEach((el, index) => {
        const element = el as HTMLElement;
        element.style.display = originalDisplays[index];
      });
      console.log('🔄 Elementos restaurados à visibilidade original');
    }
  }

  /**
   * Método de compatibilidade com a interface anterior
   * @deprecated Use downloadVisibleProposalPDF() em vez disso
   */
  async downloadProposalPDF(proposalId: number, filename: string): Promise<void> {
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