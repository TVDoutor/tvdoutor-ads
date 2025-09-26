import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  PDFDocument, StandardFonts, rgb, Degrees
} from "https://cdn.skypack.dev/pdf-lib@1.17.1?dts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Tipagem do snapshot imutável
type Snap = {
  header: {
    id: number; customer_name: string; customer_email?: string | null;
    city?: string | null; created_at: string; status?: string | null;
    discount_pct?: number | null; discount_fixed?: number | null;
    cpm_mode?: string | null; cpm_value?: number | null;
    insertions_per_hour?: number | null; film_seconds?: number | null;
    start_date?: string | null; end_date?: string | null;
    nome_agencia?: string | null; nome_projeto?: string | null; 
    cliente_final?: string | null;
  };
  items: Array<{
    screen_id: number; code?: string | null; screen_name?: string | null;
    city?: string | null; state?: string | null; category?: string | null;
    base_daily_traffic?: number | null; custom_cpm?: number | null;
    effective_cpm?: number | null; screen_value?: number | null;
  }>;
};

// Paleta de cores profissional
const BRAND = {
  primary: rgb(0.054, 0.647, 0.914), // #0EA5E9
  dark: rgb(0.067, 0.094, 0.153),    // #111827
  gray: rgb(0.42, 0.45, 0.50),       // #6B7280
  light: rgb(0.953, 0.957, 0.965),   // #F3F4F6
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { 
        status: 405,
        headers: corsHeaders 
      })
    }
    
    const { proposalId, logoUrl } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log('Generating professional PDF for proposal:', proposalId);

    // 1) Buscar dados da proposta diretamente (sem snapshot por enquanto)
    const { data: proposalData, error: proposalError } = await supabase
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
              name,
              type
            )
          )
        )
      `)
      .eq('id', proposalId)
      .single();

    if (proposalError) {
      return new Response(JSON.stringify({ error: proposalError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    if (!proposalData) {
      return new Response(JSON.stringify({ error: "Proposta não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Mapear para o formato esperado
    const snap: Snap = {
      header: {
        id: proposalData.id,
        customer_name: proposalData.customer_name,
        customer_email: proposalData.customer_email,
        city: proposalData.city,
        created_at: proposalData.created_at,
        status: proposalData.status,
        discount_pct: proposalData.discount_pct,
        discount_fixed: proposalData.discount_fixed,
        cpm_mode: proposalData.cpm_mode,
        cpm_value: proposalData.cpm_value,
        insertions_per_hour: proposalData.insertions_per_hour,
        film_seconds: proposalData.film_seconds,
        start_date: proposalData.start_date,
        end_date: proposalData.end_date,
        nome_agencia: null,
        nome_projeto: null,
        cliente_final: null
      },
      items: (proposalData.proposal_screens || []).map((ps: any) => ({
        screen_id: ps.screen_id,
        code: ps.screens?.id?.toString(),
        screen_name: ps.screens?.name,
        city: ps.screens?.city,
        state: ps.screens?.state,
        category: ps.screens?.class,
        base_daily_traffic: 1000, // valor padrão
        custom_cpm: ps.custom_cpm,
        effective_cpm: ps.custom_cpm || proposalData.cpm_value || 25,
        screen_value: (ps.custom_cpm || proposalData.cpm_value || 25) * 1
      }))
    };

    // 2) Montagem do PDF profissional
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontB = await pdf.embedFont(StandardFonts.HelveticaBold);

    // opcional: logo
    let logoImg;
    if (logoUrl) {
      try {
        const r = await fetch(logoUrl);
        if (r.ok) {
          const bytes = new Uint8Array(await r.arrayBuffer());
          try { 
            logoImg = await pdf.embedPng(bytes); 
          } catch { 
            logoImg = await pdf.embedJpg(bytes); 
          }
        }
      } catch (e) {
        console.warn('Failed to load logo:', e);
      }
    }

    const A4 = [595.28, 841.89]; // pt
    const M = 68; // margem (24mm ≈ 68pt)
    const newPage = () => pdf.addPage(A4);
    let page = newPage();

    const drawHeader = (title: string) => {
      // Faixa superior com gradiente simulado
      page.drawRectangle({ 
        x: 0, y: A4[1]-60, width: A4[0], height: 60, 
        color: BRAND.primary, opacity: 0.08 
      });
      
      // Logo quando disponível
      if (logoImg) {
        page.drawImage(logoImg, { 
          x: M, y: A4[1]-56, width: 120, height: 36, opacity: 0.95 
        });
      }
      
      // Título principal
      page.drawText(title, { 
        x: M, y: A4[1]-90, size: 20, font: fontB, color: BRAND.dark 
      });
    };

    const drawFooter = (pNo: number) => {
      // Rodapé esquerdo
      page.drawText(`TV Doutor ADS • Proposta #${snap.header.id}`, { 
        x: M, y: 36, size: 9, font, color: BRAND.gray 
      });
      
      // Paginação direita
      page.drawText(`Página ${pNo}`, { 
        x: A4[0]-M-60, y: 36, size: 9, font, color: BRAND.gray 
      });
    };

    let pNo = 1;
    
    // Cálculos consolidados
    const totalAudience = snap.items.reduce((a, i) => a + Number(i.base_daily_traffic ?? 0), 0);
    const totalScreens = snap.items.length;
    const avgCPM = Number(snap.header.cpm_value ?? 0);
    const grossValue = snap.items.reduce((a, i) => a + Number(i.screen_value ?? 0), 0);
    const discountPct = Number(snap.header.discount_pct ?? 0);
    const discountFixed = Number(snap.header.discount_fixed ?? 0);
    const netValue = Math.max(0, grossValue * (1 - discountPct/100) - discountFixed);

    // ======== CAPA ========
    drawHeader("Proposta Comercial");
    
    // Informações principais na capa
    let y = A4[1]-130;
    page.drawText(`Cliente: ${snap.header.customer_name || "-"}`, { 
      x: M, y, size: 14, font: fontB, color: BRAND.dark 
    });
    y -= 25;
    
    if (snap.header.nome_projeto) {
      page.drawText(`Projeto: ${snap.header.nome_projeto}`, { 
        x: M, y, size: 12, font, color: BRAND.dark 
      });
      y -= 20;
    }
    
    if (snap.header.nome_agencia) {
      page.drawText(`Agência: ${snap.header.nome_agencia}`, { 
        x: M, y, size: 12, font, color: BRAND.dark 
      });
      y -= 20;
    }
    
    page.drawText(`Cidade: ${snap.header.city || "-"}`, { 
      x: M, y, size: 12, font, color: BRAND.dark 
    });
    y -= 20;
    
    page.drawText(`Data: ${new Date(snap.header.created_at).toLocaleDateString("pt-BR")}`, { 
      x: M, y, size: 12, font, color: BRAND.dark 
    });
    y -= 40;

    // Destacar valor total na capa
    page.drawRectangle({
      x: M-10, y: y-35, width: A4[0]-2*M+20, height: 50,
      color: BRAND.primary, opacity: 0.08
    });
    
    page.drawText(`Investimento Total: R$ ${netValue.toLocaleString("pt-BR", {minimumFractionDigits: 2})}`, { 
      x: M, y: y-10, size: 16, font: fontB, color: BRAND.primary 
    });
    
    // Marca d'água discreta
    page.drawText("TV DOUTOR ADS", { 
      x: 100, y: 250, size: 64, font: fontB, 
      color: BRAND.primary, rotate: Degrees(25), opacity: 0.06 
    });
    
    drawFooter(pNo++);

    // ======== RESUMO EXECUTIVO ========
    page = newPage();
    drawHeader("Resumo Executivo");

    const bullet = (y: number, t: string) => { 
      page.drawCircle({ x: M+4, y: y+3, size: 2, color: BRAND.primary }); 
      page.drawText(t, { x: M+12, y, size: 12, font, color: BRAND.dark }); 
    };
    
    y = A4[1]-130;
    bullet(y, `Telas selecionadas: ${totalScreens}`); y -= 18;
    bullet(y, `Audiência diária estimada: ${totalAudience.toLocaleString("pt-BR")}`); y -= 18;
    bullet(y, `CPM médio (${snap.header.cpm_mode || "padrão"}): R$ ${avgCPM.toFixed(2)}`); y -= 18;
    bullet(y, `Investimento bruto: R$ ${grossValue.toLocaleString("pt-BR", {minimumFractionDigits: 2})}`); y -= 18;
    bullet(y, `Descontos: ${discountPct}% + R$ ${discountFixed.toLocaleString("pt-BR", {minimumFractionDigits: 2})}`); y -= 18;
    bullet(y, `Investimento líquido: R$ ${netValue.toLocaleString("pt-BR", {minimumFractionDigits: 2})}`); y -= 24;

    // Período de veiculação se definido
    if (snap.header.start_date && snap.header.end_date) {
      const startDate = new Date(snap.header.start_date).toLocaleDateString("pt-BR");
      const endDate = new Date(snap.header.end_date).toLocaleDateString("pt-BR");
      bullet(y, `Período: ${startDate} a ${endDate}`); y -= 18;
    }

    // Caixa de observação
    y -= 20;
    page.drawRectangle({ 
      x: M, y: y-40, width: A4[0]-2*M, height: 70, 
      color: BRAND.primary, opacity: 0.06, 
      borderColor: BRAND.primary, borderWidth: 1 
    });
    page.drawText("Observação:", { 
      x: M+12, y: y+18, size: 11, font: fontB, color: BRAND.dark 
    });
    page.drawText("Valores estimados conforme audiência e CPM. Sujeitos à validação de disponibilidade e material.", { 
      x: M+12, y, size: 11, font, color: BRAND.dark 
    });
    
    drawFooter(pNo++);

    // ======== INVESTIMENTO (TABELA DETALHADA) ========
    page = newPage();
    drawHeader("Investimento por Tela");
    
    const cols = [
      { key: "code", title: "Código", w: 80 },
      { key: "screen_name", title: "Tela", w: 180 },
      { key: "city", title: "Cidade", w: 90 },
      { key: "state", title: "UF", w: 35 },
      { key: "base_daily_traffic", title: "Audiência/dia", w: 85 },
      { key: "effective_cpm", title: "CPM", w: 50 },
      { key: "screen_value", title: "Valor (R$)", w: 75 },
    ] as const;

    let yy = A4[1]-120;
    
    const drawTableHeader = () => {
      // Cabeçalho da tabela com fundo
      page.drawRectangle({
        x: M-5, y: yy-5, width: A4[0]-2*M+10, height: 20,
        color: BRAND.light, opacity: 1
      });
      
      let x = M;
      cols.forEach(c => { 
        page.drawText(c.title, { 
          x, y: yy, size: 10, font: fontB, color: BRAND.dark 
        }); 
        x += c.w; 
      });
      yy -= 12;
      
      // Linha separadora
      page.drawLine({ 
        start: { x: M, y: yy }, end: { x: A4[0]-M, y: yy }, 
        thickness: 0.5, color: BRAND.gray 
      });
      yy -= 8;
    };
    
    drawTableHeader();

    const drawRow = (r: any, zebra: boolean) => {
      // Nova página se necessário
      if (yy < 120) { 
        drawFooter(pNo++); 
        page = newPage(); 
        drawHeader("Investimento por Tela (cont.)"); 
        yy = A4[1]-120; 
        drawTableHeader(); 
      }
      
      // Fundo zebrado
      if (zebra) {
        page.drawRectangle({ 
          x: M-4, y: yy-2, width: A4[0]-2*M+8, height: 14, 
          color: BRAND.light, opacity: 0.3 
        });
      }
      
      let x = M;
      const vals = [
        r.code ?? "-", 
        r.screen_name ?? "-", 
        r.city ?? "-", 
        r.state ?? "-",
        (r.base_daily_traffic ?? 0).toLocaleString("pt-BR"), 
        `R$ ${(r.effective_cpm ?? 0).toFixed(2)}`,
        `R$ ${(r.screen_value ?? 0).toFixed(2)}`
      ];
      
      vals.forEach((v, i) => { 
        const isNumeric = i >= 4; // Colunas numéricas à direita
        page.drawText(String(v), { 
          x: isNumeric ? x + cols[i].w - 5 - String(v).length * 5 : x, 
          y: yy, size: 10, font, color: BRAND.dark 
        }); 
        x += cols[i].w; 
      });
      yy -= 14;
    };

    // Renderizar todas as linhas (limitado a primeira página de itens para performance)
    const itemsToShow = snap.items.slice(0, 25); // Primeiras 25 telas
    itemsToShow.forEach((item, idx) => drawRow(item, idx % 2 === 1));

    // Totais na tabela
    if (yy < 150) { 
      drawFooter(pNo++); 
      page = newPage(); 
      drawHeader("Resumo de Investimento"); 
      yy = A4[1]-120; 
    }
    
    yy -= 6; 
    page.drawLine({ 
      start: { x: M, y: yy }, end: { x: A4[0]-M, y: yy }, 
      thickness: 0.5, color: BRAND.gray 
    }); 
    yy -= 18;
    
    page.drawText(`Subtotal: R$ ${grossValue.toLocaleString("pt-BR", {minimumFractionDigits: 2})}`, { 
      x: M, y: yy, size: 11, font, color: BRAND.dark 
    }); 
    yy -= 16;
    
    page.drawText(`Desconto ${discountPct}%: -R$ ${(grossValue * discountPct/100).toLocaleString("pt-BR", {minimumFractionDigits: 2})}`, { 
      x: M, y: yy, size: 11, font, color: BRAND.dark 
    }); 
    yy -= 16;
    
    page.drawText(`Desconto fixo: -R$ ${discountFixed.toLocaleString("pt-BR", {minimumFractionDigits: 2})}`, { 
      x: M, y: yy, size: 11, font, color: BRAND.dark 
    }); 
    yy -= 16;
    
    // Total destacado
    page.drawRectangle({
      x: M-5, y: yy-8, width: 300, height: 20,
      color: BRAND.primary, opacity: 0.1
    });
    page.drawText(`TOTAL: R$ ${netValue.toLocaleString("pt-BR", {minimumFractionDigits: 2})}`, { 
      x: M, y: yy, size: 13, font: fontB, color: BRAND.primary 
    });
    
    drawFooter(pNo++);

    // ======== CRONOGRAMA & SLA ========
    page = newPage(); 
    drawHeader("Cronograma & SLA");
    
    const infoRow = (label: string, value: string, y: number) => {
      page.drawText(label, { x: M, y, size: 11, font: fontB, color: BRAND.dark });
      page.drawText(value, { x: M+180, y, size: 11, font, color: BRAND.dark });
    };
    
    let y3 = A4[1]-130;
    infoRow("Início previsto:", snap.header.start_date ? new Date(snap.header.start_date).toLocaleDateString("pt-BR") : "a definir", y3); y3 -= 20;
    infoRow("Entrega de arte:", "D+3 úteis após briefing completo", y3); y3 -= 20;
    infoRow("Validação técnica:", "até 24h após entrega do material", y3); y3 -= 20;
    infoRow("Publicação:", "até 48h após aceite e material validado", y3); y3 -= 20;
    infoRow("Validade da proposta:", "15 dias corridos a partir da data de emissão", y3); y3 -= 30;
    
    // Contatos
    page.drawText("Contatos:", { x: M, y: y3, size: 12, font: fontB, color: BRAND.dark }); y3 -= 18;
    page.drawText("Comercial: comercial@tvdoutor.com", { x: M+12, y: y3, size: 10, font, color: BRAND.dark }); y3 -= 16;
    page.drawText("Operações: ops@tvdoutor.com", { x: M+12, y: y3, size: 10, font, color: BRAND.dark }); y3 -= 16;
    page.drawText("Suporte: suporte@tvdoutor.com", { x: M+12, y: y3, size: 10, font, color: BRAND.dark }); 
    
    drawFooter(pNo++);

    // ======== TERMOS & ACEITE ========
    page = newPage(); 
    drawHeader("Termos Comerciais & Aceite");
    
    let y4 = A4[1]-130;
    const terms = [
      "• Valores em R$, tributos conforme legislação vigente.",
      "• Instalação/logística quando aplicável não incluída, salvo especificação contrária.",
      "• Faturamento: 28 dias corridos; multas por atraso conforme contrato padrão.",
      "• Materiais devem seguir especificações técnicas e prazos informados.",
      "• Alterações de cronograma sujeitas à disponibilidade e custos adicionais.",
      "• Este documento é confidencial e de uso exclusivo do destinatário.",
      "• Proposta válida por 15 dias corridos a partir da data de emissão."
    ];
    
    terms.forEach(t => { 
      page.drawText(t, { x: M, y: y4, size: 11, font, color: BRAND.dark }); 
      y4 -= 18; 
    });

    y4 -= 30;
    
    // Seção de aceite
    page.drawText("ACEITE", { x: M, y: y4, size: 14, font: fontB, color: BRAND.primary }); 
    y4 -= 20;
    
    page.drawText("Declaro estar de acordo com os termos e condições desta proposta:", { 
      x: M, y: y4, size: 11, font, color: BRAND.dark 
    }); 
    y4 -= 30;
    
    // Linhas para assinatura
    page.drawLine({ 
      start: { x: M, y: y4 }, end: { x: M+200, y: y4 }, 
      thickness: 1, color: BRAND.dark 
    });
    page.drawLine({ 
      start: { x: M+220, y: y4 }, end: { x: A4[0]-M, y: y4 }, 
      thickness: 1, color: BRAND.dark 
    });
    
    y4 -= 15;
    page.drawText("Assinatura", { x: M, y: y4, size: 9, font, color: BRAND.gray });
    page.drawText("Data", { x: M+220, y: y4, size: 9, font, color: BRAND.gray });
    
    y4 -= 25;
    page.drawLine({ 
      start: { x: M, y: y4 }, end: { x: M+200, y: y4 }, 
      thickness: 1, color: BRAND.dark 
    });
    page.drawLine({ 
      start: { x: M+220, y: y4 }, end: { x: A4[0]-M, y: y4 }, 
      thickness: 1, color: BRAND.dark 
    });
    
    y4 -= 15;
    page.drawText("Nome / Cargo", { x: M, y: y4, size: 9, font, color: BRAND.gray });
    page.drawText("CPF/CNPJ", { x: M+220, y: y4, size: 9, font, color: BRAND.gray });

    drawFooter(pNo++);

    // 3) Salvar no Storage
    const pdfBytes = await pdf.save();
    const bucket = "proposals";
    const path = `pdf/proposal_${proposalId}_professional.pdf`;
    
    // Criar bucket se não existir
    await supabase.storage.createBucket(bucket).catch(() => {});
    
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, pdfBytes, {
      contentType: "application/pdf", upsert: true
    });
    
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // URL assinada válida por 30 dias
    const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 30);
    const pdfUrl = signed?.signedUrl ?? null;

    // Atualizar proposta com URL do PDF
    await supabase.from("proposals")
      .update({ pdf_path: path, pdf_url: pdfUrl })
      .eq("id", proposalId);

    return new Response(JSON.stringify({ ok: true, pdf_url: pdfUrl, pdf_path: path }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (e) {
    console.error('Professional PDF generation error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
