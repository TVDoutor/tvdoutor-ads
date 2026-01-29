/**
 * Edge Function: tvd-player-status
 *
 * Lê tvd_player_status via service role e devolve os dados para o Inventário (Conexão TVD).
 * verify_jwt = false para o preflight OPTIONS passar; validamos JWT manualmente no POST.
 *
 * POST, body: { venue_codes?: string[] }, header Authorization: Bearer <jwt>
 * Resposta: { data: [...] }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const BATCH = 200;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const json = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return json({ error: "Missing Authorization header" }, 401);
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
  if (authErr || !user) {
    return json({ error: "Invalid or expired token" }, 401);
  }

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let venueCodes: string[] = [];
    try {
      const body = (await req.json()) as { venue_codes?: string[] };
      venueCodes = Array.isArray(body?.venue_codes) ? body.venue_codes : [];
    } catch {
      /* body vazio ou JSON inválido */
    }

    const codes = [...new Set(venueCodes.filter(Boolean))];
    if (codes.length === 0) {
      return json({ data: [] }, 200);
    }

    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < codes.length; i += BATCH) {
      const batch = codes.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from("tvd_player_status")
        .select("player_id, player_name, venue_code, is_connected, last_seen, last_sync, sync_progress, fetched_at")
        .in("venue_code", batch);

      if (error) {
        console.error("tvd-player-status: query error", error);
        return json({ error: error.message, code: error.code }, 500);
      }
      rows.push(...(data || []));
    }

    return json({ data: rows }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("tvd-player-status: error", msg);
    return json({ error: msg }, 500);
  }
});
