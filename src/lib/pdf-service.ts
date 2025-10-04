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
      console.log('📊 Buscando dados da proposta...');
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
              city,
              state,
              class,
              venue_id,
              venues (
                id,
                name
              )
            )
          )
        `)
        .eq('id', proposalId)
        .single();

      if (error) {
        console.error('❌ Erro SQL ao buscar proposta:', error);
        throw new Error(`Erro ao buscar dados da proposta: ${error.message}`);
      }
      
      if (!proposal) {
        console.error('❌ Proposta não encontrada');
        throw new Error('Proposta não encontrada');
      }

      console.log(`📊 Dados da proposta carregados: ${proposal.customer_name}`);
      console.log(`📋 Dados básicos da proposta:`, {
        id: proposal.id,
        customer_name: proposal.customer_name,
        customer_email: proposal.customer_email,
        status: proposal.status,
        screens_total: proposal.proposal_screens?.length || 0
      });

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
      console.log('📊 Buscando dados da proposta para fallback...');
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
              city,
              state,
              class,
              venue_id,
              venues (
                id,
                name
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
      console.log('📊 Buscando dados da proposta para geração client-side...');
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
              city,
              state,
              class,
              venue_id,
              venues (
                id,
                name
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
      
      // Debug dos dados da proposta
      console.log('🔍 Dados da proposta:', {
        id: proposal.id,
        customer_name: proposal.customer_name,
        customer_email: proposal.customer_email,
        status: proposal.status,
        screens_count: proposal.proposal_screens?.length || 0
      });

      // Gerar HTML da proposta (modelo relacional)
      const htmlContent = this.generateProposalHTML(proposal);
      
      // Debug para desenvolvimento: permitir visualização do HTML
      if (import.meta.env.DEV) {
        console.log('🔍 [DEV MODE] Conteúdo HTML gerado:', htmlContent.substring(0, 500) + '...');
        
        // Opcional: abrir preview em nova aba para debug
        const previewWindow = window.open('', '_blank');
        if (previewWindow) {
          previewWindow.document.write(htmlContent);
          previewWindow.document.close();
          console.log('👀 [DEV MODE] Preview aberto em nova aba para debug');
        }
      }
      
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
        console.log('📝 Conteúdo HTML recebido:', htmlContent.substring(0, 200) + '...');
        
        // Verificar se o conteúdo HTML não está vazio
        if (!htmlContent || htmlContent.trim().length === 0) {
          throw new Error('Conteúdo HTML está vazio');
        }
        
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

        // Criar elemento temporário com melhor configuração
        element = document.createElement('div');
        element.innerHTML = htmlContent;
        element.style.cssText = `
          position: absolute !important;
          left: -9999px !important;
          top: -9999px !important;
          width: 800px !important;
          min-height: 600px !important;
          background-color: white !important;
          font-family: Arial, sans-serif !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
          color: #000 !important;
          visibility: hidden !important;
        `;
        
        document.body.appendChild(element);
        console.log('🎨 Elemento HTML criado e adicionado ao DOM');

        // Aguardar renderização do DOM
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar se o elemento foi renderizado corretamente
        console.log('📏 Dimensões do elemento:', {
          width: element.offsetWidth,
          height: element.offsetHeight,
          childNodes: element.childNodes.length
        });

        const options = {
          margin: [10, 10, 10, 10],
          filename: filename,
          image: { 
            type: 'jpeg', 
            quality: 0.95 
          },
          html2canvas: { 
            scale: 1.5,
            useCORS: true,
            letterRendering: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,  // Desativar logging em produção
            width: 800,
            height: null,
            scrollX: 0,
            scrollY: 0
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: false  // Desabilitar compressão para debug
          },
          pagebreak: { 
            mode: 'avoid-all'
          }
        };

        console.log('⚙️ Configurações do PDF definidas, iniciando geração...');

        window.html2pdf()
          .set(options)
          .from(element)
          .outputPdf('blob')
          .then((pdfBlob: Blob) => {
            console.log(`✅ PDF gerado com sucesso: ${pdfBlob.size} bytes`);
            
            // Verificar se o PDF não está vazio
            if (pdfBlob.size < 1000) {
              console.warn('⚠️ PDF parece estar muito pequeno, pode estar vazio');
            }
            
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
   * Gera HTML da proposta para PDF
   */
  private generateProposalHTML(proposal: any): string {
    // Validação inicial dos dados
    if (!proposal) {
      console.error('❌ Dados da proposta não fornecidos');
      throw new Error('Dados da proposta não disponíveis');
    }

    console.log('🔍 Dados completos da proposta:', {
      id: proposal.id,
      customer_name: proposal.customer_name,
      customer_email: proposal.customer_email,
      status: proposal.status,
      proposal_screens: proposal.proposal_screens?.length || 0,
      start_date: proposal.start_date,
      end_date: proposal.end_date,
      net_calendar: proposal.net_calendar
    });

    const formatCurrency = (value?: number) => {
      if (!value) return 'R$ 0,00';
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    const formatDate = (dateString: string | null) => {
      if (!dateString) return 'Não definido';
      try {
        return new Date(dateString).toLocaleDateString('pt-BR');
      } catch {
        return 'Data inválida';
      }
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
        default: return status || 'Indefinido';
      }
    };

    // Debug das telas antes de gerar HTML
    console.log('🔍 Dados das telas completos:', proposal.proposal_screens);
    
    const screensHtml = (
      proposal.proposal_screens && Array.isArray(proposal.proposal_screens) && proposal.proposal_screens.length > 0
        ? proposal.proposal_screens.map((ps: any, index: number) => {
            console.log(`🖥️ Processando tela ${index + 1}:`, ps);
            const screenData = ps.screens || ps.screen || {};
            const venueData = screenData.venues || screenData.venue || {};
            
            return `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 8px; border-right: 1px solid #f3f4f6;">${screenData.name || screenData.display_name || `Tela ${index + 1}`}</td>
              <td style="padding: 12px 8px; border-right: 1px solid #f3f4f6;">${venueData.name || screenData.address_raw || screenData.city || 'N/A'}</td>
              <td style="padding: 12px 8px; border-right: 1px solid #f3f4f6;">${screenData.city || 'N/A'}</td>
              <td style="padding: 12px 8px; border-right: 1px solid #f3f4f6;">${screenData.class || 'N/A'}</td>
              <td style="padding: 12px 8px; text-align: right;">
                ${ps.custom_cpm ? formatCurrency(ps.custom_cpm) : 'Padrão'}
              </td>
            </tr>
          `;
          }).join('')
        : '<tr><td colspan="5" style="padding: 30px; text-align: center; color: #6b7280; font-style: italic;">Nenhuma tela selecionada para esta proposta</td></tr>'
    );

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proposta #${proposal.id || 'N/A'} - TV Doutor ADS</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: #667eea;
            color: white;
            border-radius: 10px;
          }
          .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
          }
          .header p {
            font-size: 1.1em;
            opacity: 0.9;
          }
          .proposal-info {
            background: #f8fafc;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 5px solid #667eea;
          }
          .proposal-info h2 {
            margin-bottom: 20px;
            color: #1f2937;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .info-label {
            font-weight: 600;
            color: #374151;
          }
          .info-value {
            color: #1f2937;
            font-weight: 500;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            background: #dbeafe;
            color: #1e40af;
          }
          .section-title {
            font-size: 1.4em;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #667eea;
          }
          .financial-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
          }
          .financial-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            text-align: center;
          }
          .financial-label {
            font-size: 0.9em;
            color: #6b7280;
            margin-bottom: 5px;
          }
          .financial-value {
            font-size: 1.4em;
            font-weight: 700;
            color: #059669;
          }
          .screens-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .screens-table th {
            background: #f8fafc;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
          }
          .screens-table td {
            padding: 12px 8px;
            border-bottom: 1px solid #e5e7eb;
            border-right: 1px solid #f3f4f6;
          }
          .screens-table td:last-child {
            border-right: none;
            text-align: right;
          }
          .footer {
            margin-top: 50px;
            padding: 30px;
            background: #f8fafc;
            border-radius: 8px;
            text-align: center;
            border-top: 3px solid #667eea;
          }
          .footer h3 {
            color: #1f2937;
            margin-bottom: 10px;
          }
          .footer p {
            color: #6b7280;
            font-size: 0.9em;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>TV Doutor ADS</h1>
            <p>Proposta Comercial Digital Out-of-Home</p>
          </div>
          
          <!-- Proposal Info -->
          <div class="proposal-info">
            <h2>Proposta #${proposal.id || 'N/A'}</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Cliente:</span>
                <span class="info-value">${proposal.customer_name || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Email:</span>
                <span class="info-value">${proposal.customer_email || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Tipo:</span>
                <span class="info-value">${proposal.proposal_type === 'avulsa' ? 'Campanha Avulsa' : 'Projeto'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status:</span>
                <span class="status-badge">${getStatusLabel(proposal.status)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Período:</span>
                <span class="info-value">${formatDate(proposal.start_date)} - ${formatDate(proposal.end_date)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Criada em:</span>
                <span class="info-value">${formatDate(proposal.created_at)}</span>
              </div>
            </div>
          </div>
          
          <!-- Financial Summary -->
          ${proposal.net_calendar ? `
          <div style="margin-bottom: 30px;">
            <h3 class="section-title">Resumo Financeiro</h3>
            <div class="financial-grid">
              <div class="financial-card">
                <div class="financial-label">Valor Líquido</div>
                <div class="financial-value">${formatCurrency(proposal.net_calendar)}</div>
              </div>
              ${proposal.days_calendar ? `
              <div class="financial-card">
                <div class="financial-label">Dias</div>
                <div class="financial-value" style="color: #1f2937;">${formatNumber(proposal.days_calendar)}</div>
              </div>
              ` : ''}
              ${proposal.impacts_calendar ? `
              <div class="financial-card">
                <div class="financial-label">Impactos</div>
                <div class="financial-value" style="color: #1f2937;">${formatNumber(proposal.impacts_calendar)}</div>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}
          
          <!-- Screens List -->
          <div style="margin-bottom: 30px;">
            <h3 class="section-title">Telas Selecionadas (${proposal.proposal_screens?.length || 0})</h3>
            <table class="screens-table">
              <thead>
                <tr>
                  <th>Nome da Tela</th>
                  <th>Local</th>
                  <th>Cidade</th>
                  <th>Classe</th>
                  <th>CPM</th>
                </tr>
              </thead>
              <tbody>
                ${screensHtml}
              </tbody>
            </table>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <h3>TV Doutor ADS</h3>
            <p>Digital Out-of-Home Platform</p>
            <p style="margin-top: 10px;">
              Documento gerado automaticamente em ${formatDate(new Date().toISOString())}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('📄 HTML gerado com sucesso, tamanho:', htmlContent.length);
    return htmlContent;
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
