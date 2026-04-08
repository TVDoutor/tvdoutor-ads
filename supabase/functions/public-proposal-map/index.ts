/**
 * Edge Function: public-proposal-map
 *
 * GET ?token=<uuid> — retorna título de exibição + telas (lat/lng, código, nomes) para mapa público.
 * Responde para qualquer proposta com token válido, incluindo rascunho.
 * Usa service role; não expor dados financeiros.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  let token: string | null = null;
  try {
    const u = new URL(req.url);
    token = u.searchParams.get("token")?.trim() ?? null;
  } catch {
    token = null;
  }

  if (!token || !UUID_RE.test(token)) {
    return json({ error: "Not found" }, 404);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("public-proposal-map: missing env");
    return json({ error: "Server misconfiguration" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: proposal, error: pErr } = await supabase
    .from("proposals")
    .select("id, customer_name, status, projeto_id")
    .eq("public_map_token", token)
    .maybeSingle();

  if (pErr) {
    console.error("public-proposal-map: proposal query", pErr);
    return json({ error: "Not found" }, 404);
  }

  if (!proposal) {
    return json({ error: "Not found" }, 404);
  }

  let nomeProjeto: string | null = null;
  if (proposal.projeto_id) {
    const { data: proj } = await supabase
      .from("agencia_projetos")
      .select("nome_projeto")
      .eq("id", proposal.projeto_id)
      .maybeSingle();
    nomeProjeto = proj?.nome_projeto ?? null;
  }

  const displayTitle =
    nomeProjeto?.trim() ||
    (proposal.customer_name && String(proposal.customer_name).trim()) ||
    `Proposta #${proposal.id}`;

  const { data: rows, error: sErr } = await supabase
    .from("proposal_screens")
    .select(
      `
      screens (
        id,
        code,
        name,
        display_name,
        lat,
        lng
      )
    `
    )
    .eq("proposal_id", proposal.id);

  if (sErr) {
    console.error("public-proposal-map: screens query", sErr);
    return json({ error: "Not found" }, 404);
  }

  const screens: Array<{
    id: number;
    code?: string | null;
    name?: string | null;
    display_name?: string | null;
    lat?: unknown;
    lng?: unknown;
  }> = [];

  for (const row of rows ?? []) {
    const s = (row as { screens?: Record<string, unknown> | null }).screens;
    if (!s || typeof s !== "object") continue;
    const id = Number((s as { id?: unknown }).id);
    if (!Number.isFinite(id)) continue;
    screens.push({
      id,
      code: (s as { code?: string | null }).code ?? null,
      name: (s as { name?: string | null }).name ?? null,
      display_name: (s as { display_name?: string | null }).display_name ?? null,
      lat: (s as { lat?: unknown }).lat,
      lng: (s as { lng?: unknown }).lng,
    });
  }

  return json({ displayTitle, screens }, 200);
});
