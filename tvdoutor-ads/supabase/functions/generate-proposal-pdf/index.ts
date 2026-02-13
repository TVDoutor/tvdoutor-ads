import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProposalData {
  id: number;
  customer_name: string;
  customer_email: string;
  proposal_type: 'avulsa' | 'projeto';
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  insertions_per_hour?: number;
  film_seconds?: number;
  cpm_mode?: string;
  cpm_value?: number;
  discount_pct?: number;
  discount_fixed?: number;
  days_calendar?: number;
  days_business?: number;
  impacts_calendar?: number;
  impacts_business?: number;
  gross_calendar?: number;
  gross_business?: number;
  net_calendar?: number;
  net_business?: number;
  screens?: any[];
  created_by?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get proposal ID from URL
    const url = new URL(req.url)
    const proposalId = url.searchParams.get('proposalId')
    
    if (!proposalId) {
      return new Response(
        JSON.stringify({ error: 'Proposal ID is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('Generating PDF for proposal:', proposalId)

    // Fetch proposal data
    const { data: proposal, error: proposalError } = await supabase
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
      .single()

    if (proposalError) {
      console.error('Error fetching proposal:', proposalError)
      return new Response(
        JSON.stringify({ error: 'Proposal not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // Generate PDF content
    const pdfContent = generatePDFHTML(proposal)
    
    // For now, return the HTML content
    // In production, you would use a PDF generation library like:
    // - Puppeteer: https://deno.land/x/puppeteer
    // - jsPDF: https://esm.sh/jspdf
    // - HTML to PDF API services
    
    const pdfBuffer = await generatePDFFromHTML(pdfContent)
    
    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="proposta-${proposalId}.pdf"`,
      },
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate PDF',
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function generatePDFHTML(proposal: ProposalData): string {
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
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proposta Comercial #${proposal.id}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: white;
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 15px;
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
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
            text-transform: uppercase;
        }
        
        .status-rascunho { background: #f3f4f6; color: #374151; }
        .status-enviada { background: #dbeafe; color: #1e40af; }
        .status-em_analise { background: #fef3c7; color: #d97706; }
        .status-aceita { background: #dcfce7; color: #16a34a; }
        .status-rejeitada { background: #fee2e2; color: #dc2626; }
        
        .section {
            margin-bottom: 30px;
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
            margin-top: 15px;
        }
        
        .financial-item {
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
            color: #1f2937;
        }
        
        .financial-value.currency {
            color: #059669;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        th {
            background: #f8fafc;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
        }
        
        td {
            padding: 8px;
            border-bottom: 1px solid #e5e7eb;
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
        
        @media print {
            body { print-color-adjust: exact; }
            .container { padding: 20px; }
            .header { break-inside: avoid; }
            .section { break-inside: avoid-page; }
            table { break-inside: avoid; }
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
            <h2 style="margin-bottom: 15px; color: #1f2937;">Proposta #${proposal.id}</h2>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Cliente:</span>
                    <span class="info-value">${proposal.customer_name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${proposal.customer_email}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Tipo:</span>
                    <span class="info-value">${proposal.proposal_type === 'avulsa' ? 'Campanha Avulsa' : 'Projeto'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Status:</span>
                    <span class="status-badge status-${proposal.status}">${getStatusLabel(proposal.status)}</span>
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
        
        <!-- Campaign Details -->
        <div class="section">
            <h3 class="section-title">Detalhes da Campanha</h3>
            <div class="financial-grid">
                ${proposal.insertions_per_hour ? `
                <div class="financial-item">
                    <div class="financial-label">Inserções/Hora</div>
                    <div class="financial-value">${proposal.insertions_per_hour}</div>
                </div>
                ` : ''}
                ${proposal.film_seconds ? `
                <div class="financial-item">
                    <div class="financial-label">Duração do Filme</div>
                    <div class="financial-value">${proposal.film_seconds}s</div>
                </div>
                ` : ''}
                ${proposal.cpm_mode ? `
                <div class="financial-item">
                    <div class="financial-label">Modo CPM</div>
                    <div class="financial-value">${proposal.cpm_mode === 'manual' ? 'Manual' : 'Automático'}</div>
                </div>
                ` : ''}
                ${proposal.cpm_value ? `
                <div class="financial-item">
                    <div class="financial-label">CPM</div>
                    <div class="financial-value currency">${formatCurrency(proposal.cpm_value)}</div>
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Financial Summary -->
        <div class="section">
            <h3 class="section-title">Resumo Financeiro</h3>
            <div class="financial-grid">
                ${proposal.days_calendar ? `
                <div class="financial-item">
                    <div class="financial-label">Dias (Calendário)</div>
                    <div class="financial-value">${formatNumber(proposal.days_calendar)}</div>
                </div>
                ` : ''}
                ${proposal.days_business ? `
                <div class="financial-item">
                    <div class="financial-label">Dias Úteis</div>
                    <div class="financial-value">${formatNumber(proposal.days_business)}</div>
                </div>
                ` : ''}
                ${proposal.impacts_calendar ? `
                <div class="financial-item">
                    <div class="financial-label">Impactos (Calendário)</div>
                    <div class="financial-value">${formatNumber(proposal.impacts_calendar)}</div>
                </div>
                ` : ''}
                ${proposal.impacts_business ? `
                <div class="financial-item">
                    <div class="financial-label">Impactos (Úteis)</div>
                    <div class="financial-value">${formatNumber(proposal.impacts_business)}</div>
                </div>
                ` : ''}
                ${proposal.gross_calendar ? `
                <div class="financial-item">
                    <div class="financial-label">Valor Bruto (Calendário)</div>
                    <div class="financial-value currency">${formatCurrency(proposal.gross_calendar)}</div>
                </div>
                ` : ''}
                ${proposal.net_calendar ? `
                <div class="financial-item">
                    <div class="financial-label">Valor Líquido (Calendário)</div>
                    <div class="financial-value currency">${formatCurrency(proposal.net_calendar)}</div>
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Screens List -->
        <div class="section">
            <h3 class="section-title">Telas Selecionadas (${proposal.proposal_screens?.length || 0})</h3>
            <table>
                <thead>
                    <tr>
                        <th>Nome da Tela</th>
                        <th>Local</th>
                        <th>Cidade</th>
                        <th>Classe</th>
                        <th>CPM Customizado</th>
                    </tr>
                </thead>
                <tbody>
                    ${screensHtml}
                </tbody>
            </table>
        </div>
        
        <!-- Discounts -->
        ${(proposal.discount_pct || proposal.discount_fixed) ? `
        <div class="section">
            <h3 class="section-title">Descontos Aplicados</h3>
            <div class="financial-grid">
                ${proposal.discount_pct ? `
                <div class="financial-item">
                    <div class="financial-label">Desconto Percentual</div>
                    <div class="financial-value">${proposal.discount_pct}%</div>
                </div>
                ` : ''}
                ${proposal.discount_fixed ? `
                <div class="financial-item">
                    <div class="financial-label">Desconto Fixo</div>
                    <div class="financial-value currency">${formatCurrency(proposal.discount_fixed)}</div>
                </div>
                ` : ''}
            </div>
        </div>
        ` : ''}
        
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
}

async function generatePDFFromHTML(htmlContent: string): Promise<Uint8Array> {
  // For now, we'll return a simple PDF placeholder
  // In production, you would use a proper PDF generation library
  
  // Simple PDF structure (this is a basic implementation)
  // You should use a proper library like Puppeteer or jsPDF
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 100 >>
stream
BT
/F1 12 Tf
50 750 Td
(Proposta Comercial - PDF em desenvolvimento) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000275 00000 n 
0000000425 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
525
%%EOF`;

  return new TextEncoder().encode(pdfContent);
}

/* 
PRODUCTION PDF GENERATION EXAMPLE:

import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

async function generatePDFFromHTML(htmlContent: string): Promise<Uint8Array> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  });
  
  await browser.close();
  
  return pdf;
}
*/

