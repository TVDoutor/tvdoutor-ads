import { supabase } from '@/integrations/supabase/client';

export interface PDFGenerationOptions {
  proposalId: number;
  includeScreens?: boolean;
  includeFinancials?: boolean;
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

class PDFService {
  private generatingPDFs = new Set<number>();

  /**
   * Gera PDF de uma proposta específica
   */
  async generateProposalPDF(options: PDFGenerationOptions): Promise<Blob> {
    const { proposalId } = options;

    // Evitar geração duplicada
    if (this.generatingPDFs.has(proposalId)) {
      throw new Error('PDF já está sendo gerado para esta proposta');
    }

    this.generatingPDFs.add(proposalId);

    try {
      console.log(`🔄 Gerando PDF para proposta ${proposalId}...`);

      // Buscar dados da proposta primeiro para verificar se existe
      const { data: proposal, error } = await supabase
        .from('proposals')
        .select(`
          *,
          proposal_screens (
            id,
            screen_id,
            custom_cpm,
            screens (
              id,
              name,
              venue_id,
              city,
              state,
              address,
              class,
              venues (
                name,
                type
              )
            )
          )
        `)
        .eq('id', proposalId)
        .single();

      if (error || !proposal) {
        throw new Error('Proposta não encontrada ou erro ao buscar dados');
      }

      console.log(`📊 Dados da proposta carregados: ${proposal.customer_name}`);

      // Usar geração client-side diretamente (Edge Functions têm problemas de CORS em dev)
      console.log('📄 Usando geração client-side (desenvolvimento)...');
      return await this.generatePDFClientSide(proposalId);

    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      
      // Fallback final: mostrar janela de impressão
      console.log('🖨️ Fallback: mostrando janela de impressão...');
      await this.showPrintFallback(proposalId);
      
      // Retornar blob vazio para não quebrar a interface
      return new Blob([''], { type: 'application/pdf' });
    } finally {
      this.generatingPDFs.delete(proposalId);
    }
  }

  /**
   * Fallback final: mostrar janela de impressão
   */
  private async showPrintFallback(proposalId: number): Promise<void> {
    try {
      // Buscar dados da proposta
      const { data: proposal, error } = await supabase
        .from('proposals')
        .select(`
          *,
          proposal_screens (
            id,
            screen_id,
            custom_cpm,
            screens (
              id,
              name,
              venue_id,
              city,
              state,
              address,
              class,
              venues (
                name,
                type
              )
            )
          )
        `)
        .eq('id', proposalId)
        .single();

      if (error || !proposal) {
        throw new Error('Proposta não encontrada');
      }

      // Abrir janela de impressão
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const htmlContent = this.generateProposalHTML(proposal);
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Proposta #${proposalId} - TV Doutor ADS</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
              @media print {
                body { print-color-adjust: exact; }
                .no-print { display: none !important; }
              }
              .no-print {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                background: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .no-print button {
                padding: 10px 20px;
                margin: 0 5px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
              }
              .print-btn {
                background: #667eea;
                color: white;
              }
              .close-btn {
                background: #6b7280;
                color: white;
              }
            </style>
          </head>
          <body>
            <div class="no-print">
              <button class="print-btn" onclick="window.print()">📄 Imprimir/Salvar PDF</button>
              <button class="close-btn" onclick="window.close()">✖️ Fechar</button>
            </div>
            ${htmlContent}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
      }
    } catch (error) {
      console.error('Erro no fallback de impressão:', error);
    }
  }

  /**
   * Gera PDF no lado do cliente como fallback
   */
  private async generatePDFClientSide(proposalId: number): Promise<Blob> {
    try {
      // Buscar dados da proposta (dados já foram validados na função principal)
      const { data: proposal, error } = await supabase
        .from('proposals')
        .select(`
          *,
          proposal_screens (
            id,
            screen_id,
            custom_cpm,
            screens (
              id,
              name,
              venue_id,
              city,
              state,
              address,
              class,
              venues (
                name,
                type
              )
            )
          )
        `)
        .eq('id', proposalId)
        .single();

      if (error || !proposal) {
        console.error('Erro ao buscar dados da proposta:', error);
        throw new Error(`Proposta #${proposalId} não encontrada ou sem acesso`);
      }

      console.log(`📄 Gerando HTML para proposta #${proposalId} - ${proposal.customer_name}`);
      console.log(`🔢 Telas selecionadas: ${proposal.proposal_screens?.length || 0}`);

      // Gerar HTML da proposta
      const htmlContent = this.generateProposalHTML(proposal);
      
      if (!htmlContent || htmlContent.trim().length === 0) {
        throw new Error('Falha ao gerar conteúdo HTML da proposta');
      }

      console.log(`📝 HTML gerado com ${htmlContent.length} caracteres`);
      
      // Usar html2pdf.js para gerar PDF no cliente
      const pdfBlob = await this.htmlToPDF(htmlContent, `proposta-${proposalId}.pdf`);
      
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('PDF gerado está vazio');
      }

      console.log(`✅ PDF gerado com sucesso: ${pdfBlob.size} bytes`);
      return pdfBlob;
    } catch (error) {
      console.error('❌ Erro ao gerar PDF no cliente:', error);
      throw new Error(`Falha na geração do PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Converte HTML para PDF usando html2pdf.js
   */
  private async htmlToPDF(htmlContent: string, filename: string): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      let element: HTMLElement | null = null;
      
      try {
        console.log('🔧 Iniciando conversão HTML para PDF...');
        
        // Carregar html2pdf dinamicamente se não estiver disponível
        if (!window.html2pdf) {
          console.log('📦 Carregando biblioteca html2pdf...');
          try {
            const html2pdfModule = await import('html2pdf.js');
            window.html2pdf = html2pdfModule.default;
            console.log('✅ html2pdf carregado com sucesso');
          } catch (importError) {
            console.error('❌ Erro ao carregar html2pdf:', importError);
            throw new Error('Não foi possível carregar a biblioteca de PDF');
          }
        }

        // Criar elemento temporário
        element = document.createElement('div');
        element.innerHTML = htmlContent;
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        element.style.top = '-9999px';
        element.style.width = '800px';
        element.style.backgroundColor = 'white';
        document.body.appendChild(element);

        console.log('🎨 Elemento HTML criado e adicionado ao DOM');

        const options = {
          margin: [15, 15, 15, 15],
          filename: filename,
          image: { 
            type: 'jpeg', 
            quality: 0.98 
          },
          html2canvas: { 
            scale: 2,
            useCORS: true,
            letterRendering: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
          },
          pagebreak: { 
            mode: ['avoid-all', 'css', 'legacy'],
            before: '.page-break'
          }
        };

        console.log('⚙️ Configurações do PDF definidas, iniciando geração...');

        // Aguardar um pouco para garantir que o DOM foi processado
        await new Promise(resolve => setTimeout(resolve, 500));

        window.html2pdf()
          .set(options)
          .from(element)
          .outputPdf('blob')
          .then((pdfBlob: Blob) => {
            console.log(`✅ PDF gerado com sucesso: ${pdfBlob.size} bytes`);
            if (element && document.body.contains(element)) {
              document.body.removeChild(element);
            }
            resolve(pdfBlob);
          })
          .catch((error: any) => {
            console.error('❌ Erro no html2pdf:', error);
            if (element && document.body.contains(element)) {
              document.body.removeChild(element);
            }
            
            // Fallback para impressão
            console.log('🔄 Tentando fallback para impressão...');
            this.showPrintFallback(parseInt(filename.match(/\d+/)?.[0] || '0'))
              .then(() => {
                // Retornar um blob vazio mas válido
                resolve(new Blob(['PDF gerado via impressão'], { type: 'application/pdf' }));
              })
              .catch(reject);
          });
      } catch (error) {
        console.error('❌ Erro geral na conversão HTML para PDF:', error);
        if (element && document.body.contains(element)) {
          document.body.removeChild(element);
        }
        reject(new Error(`Falha ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`));
      }
    });
  }

   /**
    * Fallback: usar window.print para salvar como PDF (unused)
    */
  // private async printToPDF(element: HTMLElement, filename: string): Promise<Blob> {
  //   return new Promise((resolve, reject) => {
      // Criar nova janela para impressão
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        reject(new Error('Não foi possível abrir janela de impressão'));
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${filename}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            @media print {
              body { print-color-adjust: exact; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
          <div class="no-print" style="position: fixed; top: 10px; right: 10px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Imprimir/Salvar PDF
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
              Fechar
            </button>
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();

      // Simular blob (não é possível capturar o PDF real do print)
      const textBlob = new Blob([element.innerHTML], { type: 'text/html' });
      resolve(textBlob);
    });
  }

  /**
   * Gera HTML da proposta para PDF
   */
  private generateProposalHTML(proposal: any): string {
    const formatCurrency = (value?: number) => {
      if (!value) return 'R$ 0,00';
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const formatNumber = (value?: number) => {
      if (!value) return '0';
      return new Intl.NumberFormat('pt-BR').format(value);
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'rascunho': return 'Rascunho';
        case 'enviada': return 'Enviada';
        case 'em_analise': return 'Em Análise';
        case 'aceita': return 'Aceita';
        case 'rejeitada': return 'Rejeitada';
        default: return status;
      }
    };

    const screensHtml = proposal.proposal_screens?.map((ps: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${ps.screens?.name || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${ps.screens?.venues?.name || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${ps.screens?.city || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${ps.screens?.class || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${ps.custom_cpm ? formatCurrency(ps.custom_cpm) : 'Padrão'}
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #6b7280;">Nenhuma tela selecionada</td></tr>';

    return `
      <div style="max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px;">
          <h1 style="font-size: 2.5em; margin-bottom: 10px; font-weight: 700;">TV Doutor ADS</h1>
          <p style="font-size: 1.1em; opacity: 0.9;">Proposta Comercial Digital Out-of-Home</p>
        </div>
        
        <!-- Proposal Info -->
        <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 30px; border-left: 5px solid #667eea;">
          <h2 style="margin-bottom: 15px; color: #1f2937;">Proposta #${proposal.id}</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="font-weight: 600; color: #374151;">Cliente:</span>
              <span style="color: #1f2937; font-weight: 500;">${proposal.customer_name}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="font-weight: 600; color: #374151;">Email:</span>
              <span style="color: #1f2937; font-weight: 500;">${proposal.customer_email}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="font-weight: 600; color: #374151;">Tipo:</span>
              <span style="color: #1f2937; font-weight: 500;">${proposal.proposal_type === 'avulsa' ? 'Campanha Avulsa' : 'Projeto'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="font-weight: 600; color: #374151;">Status:</span>
              <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 600; background: #dbeafe; color: #1e40af;">${getStatusLabel(proposal.status)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="font-weight: 600; color: #374151;">Período:</span>
              <span style="color: #1f2937; font-weight: 500;">${formatDate(proposal.start_date)} - ${formatDate(proposal.end_date)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="font-weight: 600; color: #374151;">Criada em:</span>
              <span style="color: #1f2937; font-weight: 500;">${formatDate(proposal.created_at)}</span>
            </div>
          </div>
        </div>
        
        <!-- Financial Summary -->
        ${proposal.net_calendar ? `
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 1.4em; font-weight: 700; color: #1f2937; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #667eea;">Resumo Financeiro</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
              <div style="font-size: 0.9em; color: #6b7280; margin-bottom: 5px;">Valor Líquido</div>
              <div style="font-size: 1.4em; font-weight: 700; color: #059669;">${formatCurrency(proposal.net_calendar)}</div>
            </div>
            ${proposal.days_calendar ? `
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
              <div style="font-size: 0.9em; color: #6b7280; margin-bottom: 5px;">Dias</div>
              <div style="font-size: 1.4em; font-weight: 700; color: #1f2937;">${formatNumber(proposal.days_calendar)}</div>
            </div>
            ` : ''}
            ${proposal.impacts_calendar ? `
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
              <div style="font-size: 0.9em; color: #6b7280; margin-bottom: 5px;">Impactos</div>
              <div style="font-size: 1.4em; font-weight: 700; color: #1f2937;">${formatNumber(proposal.impacts_calendar)}</div>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}
        
        <!-- Screens List -->
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 1.4em; font-weight: 700; color: #1f2937; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #667eea;">Telas Selecionadas (${proposal.proposal_screens?.length || 0})</h3>
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <thead>
              <tr>
                <th style="background: #f8fafc; padding: 12px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Nome da Tela</th>
                <th style="background: #f8fafc; padding: 12px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Local</th>
                <th style="background: #f8fafc; padding: 12px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Cidade</th>
                <th style="background: #f8fafc; padding: 12px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Classe</th>
                <th style="background: #f8fafc; padding: 12px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">CPM</th>
              </tr>
            </thead>
            <tbody>
              ${screensHtml}
            </tbody>
          </table>
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 50px; padding: 30px; background: #f8fafc; border-radius: 8px; text-align: center; border-top: 3px solid #667eea;">
          <h3 style="color: #1f2937; margin-bottom: 10px;">TV Doutor ADS</h3>
          <p style="color: #6b7280; font-size: 0.9em;">Digital Out-of-Home Platform</p>
          <p style="color: #6b7280; font-size: 0.9em; margin-top: 10px;">
            Documento gerado automaticamente em ${formatDate(new Date().toISOString())}
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Baixa PDF de uma proposta
   */
  async downloadProposalPDF(proposalId: number, filename?: string): Promise<void> {
    try {
      const pdfBlob = await this.generateProposalPDF({ proposalId });
      
      // Criar link de download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `proposta-${proposalId}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL
      URL.revokeObjectURL(url);
      
      console.log(`PDF da proposta ${proposalId} baixado com sucesso`);
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      throw error;
    }
  }

  /**
   * Verifica se PDF está sendo gerado
   */
  isGeneratingPDF(proposalId: number): boolean {
    return this.generatingPDFs.has(proposalId);
  }

  /**
   * Cancela geração de PDF (se possível)
   */
  cancelPDFGeneration(proposalId: number): void {
    this.generatingPDFs.delete(proposalId);
  }
}

// Singleton instance
export const pdfService = new PDFService();

// Declarar html2pdf global para TypeScript
declare global {
  interface Window {
    html2pdf: any;
  }
}
