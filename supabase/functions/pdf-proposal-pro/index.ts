// supabase/functions/pdf-proposal-pro/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { chromium } from "https://deno.land/x/playwright@v1.44.1/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

// ====== CORS ======
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ====== ENV/SECRETS ======
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Client com service-role (apenas na Edge)
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ====== Tipos (ajustados ao seu select) ======
type ProposalRow = {
  id: number;
  customer_name: string | null;
  customer_email: string | null;
  proposal_type: "avulsa" | "projeto";
  status: string;
  created_at: string;
  start_date?: string | null;
  end_date?: string | null;
  film_seconds?: number | null;
  insertions_per_hour?: number | null;
  cpm_value?: number | null;
  discount_pct?: number | null;
  discount_fixed?: number | null;
  gross_calendar?: number | null;
  net_calendar?: number | null;
  days_calendar?: number | null;
  impacts_calendar?: number | null;
  projeto_id?: string | null;
  agencias?: {
    id: string;
    nome_agencia: string;
    email_empresa?: string | null;
    telefone_empresa?: string | null;
  } | null;
  proposal_screens?: Array<{
    id: number;
    screen_id: number;
    custom_cpm?: number | null;
    screens: {
      id: number;
      name: string;
      city: string;
      state: string;
      class: string;
      venue_id?: number | null;
      venues?: { id: number; name: string } | null;
    };
  }> | null;
};

type ProjectRow = {
  id: string;
  nome_projeto: string;
  descricao?: string | null;
  cliente_final?: string | null;
};

// ====== Template HTML ======
function proposalToHTML(p: ProposalRow, project: ProjectRow | null, summary?: any) {
  const formatBRL = (v?: number | null) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

  const start = p.start_date ? new Date(p.start_date).toLocaleDateString("pt-BR") : "—";
  const end = p.end_date ? new Date(p.end_date).toLocaleDateString("pt-BR") : "—";
  const screensCount = p.proposal_screens?.length ?? 0;

  const cities = Array.from(
    new Set((p.proposal_screens ?? []).map((ps) => `${ps.screens.city}/${ps.screens.state}`))
  );

  const rows = (p.proposal_screens ?? [])
    .map((ps) => {
      const s = ps.screens;
      const venue = s.venues?.name ?? "—";
      return `
        <tr>
          <td>${s.id}</td>
          <td>${s.name}</td>
          <td>${venue}</td>
          <td>${s.city}</td>
          <td>${s.state}</td>
          <td>${s.class}</td>
        </tr>`;
    })
    .join("");

  return /* html */ `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Proposta #${p.id} — TV Doutor ADS</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Inter, Arial, sans-serif; color:#0f172a; margin:0; padding:32px; }
    h1 { margin:0 0 8px; font-size:28px; }
    h2 { margin:24px 0 8px; font-size:18px; }
    .muted { color:#64748b; font-size:12px; }
    .card { border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:16px; }
    .grid { display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; }
    .kpi { background: linear-gradient(135deg,#f97316,#ea580c); color:#fff; padding:16px; border-radius:12px; }
    .kpi h3 { margin:0 0 4px; font-size:12px; font-weight:600; opacity:.9; }
    .kpi .v { font-size:24px; font-weight:800; }

    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th, td { padding:8px 10px; border-bottom:1px solid #e2e8f0; font-size:12px; text-align:left; }
    th { background:#fff7ed; color:#9a3412; }

    .badge { display:inline-block; padding:4px 10px; border-radius:999px; border:1px solid #fdba74; color:#9a3412; font-size:12px; }
    .footer { margin-top:24px; font-size:11px; color:#475569; }
  </style>
</head>
<body>
  <h1>TV Doutor ADS</h1>
  <div class="muted">Proposta Comercial • ID ${p.id}</div>

  <div class="grid" style="margin-top:16px;">
    <div class="kpi">
      <h3>Investimento Total</h3>
      <div class="v">${formatBRL(p.net_calendar ?? summary?.netValue)}</div>
    </div>
    <div class="kpi">
      <h3>Telas Selecionadas</h3>
      <div class="v">${screensCount}</div>
    </div>
  </div>

  <div class="card">
    <h2>Informações do Projeto</h2>
    <div class="grid">
      <div><b>Projeto:</b> ${project?.nome_projeto ?? p.customer_name ?? "—"}</div>
      <div><b>Cliente Final:</b> ${project?.cliente_final ?? p.customer_name ?? "—"}</div>
      <div><b>Agência:</b> ${p.agencias?.nome_agencia ?? "—"}</div>
      <div><b>Email:</b> ${p.agencias?.email_empresa ?? p.customer_email ?? "—"}</div>
      <div><b>Tipo de Proposta:</b> <span class="badge">${p.proposal_type === "avulsa" ? "Campanha Avulsa" : "Projeto Especial"}</span></div>
      <div><b>Período:</b> ${start} — ${end}</div>
    </div>
  </div>

  <div class="card">
    <h2>Resumo Financeiro</h2>
    <div class="grid">
      <div><b>Valor Bruto:</b> ${formatBRL(p.gross_calendar ?? summary?.grossValue)}</div>
      <div><b>Valor Líquido:</b> ${formatBRL(p.net_calendar ?? summary?.netValue)}</div>
      <div><b>CPM:</b> ${formatBRL(p.cpm_value ?? 0)}</div>
      <div><b>Desconto %:</b> ${p.discount_pct ?? 0}%</div>
      <div><b>Desconto Fixo:</b> ${formatBRL(p.discount_fixed ?? 0)}</div>
      <div><b>Inserções/Hora:</b> ${p.insertions_per_hour ?? 0}</div>
    </div>
  </div>

  <div class="card">
    <h2>Resumo de Cobertura</h2>
    <div><b>Cidades/UF:</b> ${cities.length > 0 ? cities.join(", ") : "—"}</div>
  </div>

  <div class="card">
    <h2>Inventário Selecionado</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th><th>Tela</th><th>Local</th><th>Cidade</th><th>UF</th><th>Classe</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="6">Sem telas vinculadas.</td></tr>`}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Documento gerado automaticamente em ${new Date().toLocaleString("pt-BR")}.
  </div>
</body>
</html>`;
}

// ====== Handler ======
serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: CORS });

  try {
    const { proposalId, summary } = await req.json();

    if (!proposalId) {
      return new Response(JSON.stringify({ error: "MISSING_PROPOSAL_ID" }), {
        status: 400, headers: { ...CORS, "content-type": "application/json" },
      });
    }

    // 1) Buscar proposta + joins, igual ao front
    const { data: proposal, error } = await supabaseAdmin
      .from("proposals")
      .select(`
        *,
        agencias ( id, nome_agencia, email_empresa, telefone_empresa ),
        proposal_screens (
          id, screen_id, custom_cpm,
          screens (
            id, name, city, state, class, venue_id,
            venues ( id, name )
          )
        )
      `)
      .eq("id", proposalId)
      .single();

    if (error || !proposal) {
      return new Response(JSON.stringify({ error: error?.message || "NOT_FOUND" }), {
        status: 404, headers: { ...CORS, "content-type": "application/json" },
      });
    }

    // 2) Projeto (se houver)
    let project: ProjectRow | null = null;
    if (proposal.projeto_id) {
      const { data: prj } = await supabaseAdmin
        .from("agencia_projetos")
        .select("id, nome_projeto, descricao, cliente_final")
        .eq("id", proposal.projeto_id)
        .maybeSingle();
      project = prj ?? null;
    }

    // 3) HTML
    const html = proposalToHTML(proposal as ProposalRow, project, summary);

    // 4) Playwright → PDF
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Opcional: bloquear recursos externos p/ acelerar
    await page.route("**/*", (route) => {
      const req = route.request();
      const type = req.resourceType();
      if (["image", "media", "font", "stylesheet"].includes(type)) return route.abort();
      return route.continue();
    });

    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdfBytes = await page.pdf({ format: "A4", printBackground: true, margin: { top: "16mm", bottom: "16mm" } });
    await browser.close();

    // 5) Resposta JSON base64 (mais simples no browser)
    const base64 = encodeBase64(pdfBytes);
    return new Response(JSON.stringify({ pdfBase64: base64, kind: "pro" }), {
      status: 200,
      headers: { ...CORS, "content-type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, "content-type": "application/json" },
    });
  }
});