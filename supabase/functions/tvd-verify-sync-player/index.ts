/**
 * Edge Function: tvd-verify-sync-player
 *
 * Verifica se existe um player no app.tvdoutor para o código informado e, se existir,
 * faz upsert em tvd_player_status (sincroniza). Chamada após "Adicionar Tela" no Inventário.
 *
 * POST, body: { code: string }, header Authorization: Bearer <jwt>
 * Resposta: { found: boolean, player_id?: string, venue_code?: string, is_connected?: boolean, last_seen?: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const GRAPHQL_QUERY = `
query PlayersStatus($first: Int!, $after: String) {
  organization {
    players(first: $first, after: $after, orderBy: { field: LAST_SEEN_AT }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        name
        isConnected
        lastSeen
        lastSync
        syncProgress
      }
    }
  }
}
`;

function extractVenueCode(name: string): string | null {
  const m = String(name).trim().toUpperCase().match(/^(P\d+(?:\.\d+)*)\b/);
  return m?.[1] ?? null;
}

function toTvdFormat(code: string): string {
  const m = String(code).trim().match(/^(P\d+)\.(\d+)$/i);
  if (!m) return code;
  return `${m[1]}.${m[2].padStart(2, "0")}`;
}

function toInventoryFormat(code: string): string {
  const m = String(code).trim().match(/^(P\d+)\.0*(\d+)$/i);
  if (!m) return code;
  return `${m[1]}.${m[2]}`;
}

function matchesCode(venueCode: string, target: string): boolean {
  if (!venueCode || !target) return false;
  const t = target.trim();
  const v = venueCode.trim();
  if (v === t) return true;
  if (toTvdFormat(t) === v) return true;
  if (toInventoryFormat(v) === t) return true;
  return false;
}

function buildAuthHeaders(token: string, scheme: string): Record<string, string> {
  const t = token.trim();
  const s = (scheme || "token").toLowerCase();
  if (s === "x-api-key") return { "X-API-Key": t };
  if (s === "bearer") return { Authorization: `Bearer ${t}` };
  return { Authorization: `token ${t}` };
}

async function graphqlFetch(
  endpoint: string,
  token: string,
  scheme: string,
  variables: { first: number; after?: string | null }
): Promise<{ pageInfo?: { hasNextPage?: boolean; endCursor?: string | null }; nodes: unknown[] }> {
  const auth = buildAuthHeaders(token, scheme);
  const vars: { first: number; after?: string } = { first: variables.first };
  if (variables.after != null && variables.after !== "") vars.after = variables.after;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({ query: GRAPHQL_QUERY, variables: vars }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors));
  const players = json.data?.organization?.players;
  if (!players) throw new Error("Missing organization.players");
  return players;
}

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

  let code = "";
  try {
    const body = (await req.json()) as { code?: string };
    code = typeof body?.code === "string" ? body.code.trim() : "";
  } catch {
    /* body vazio ou inválido */
  }
  if (!code) {
    return json({ found: false, error: "Missing code" }, 200);
  }

  const gqlToken = Deno.env.get("TVDOUTOR_GRAPHQL_TOKEN")?.trim() ?? "";
  if (!gqlToken) {
    console.error("tvd-verify-sync-player: TVDOUTOR_GRAPHQL_TOKEN not set");
    return json({ found: false, error: "GraphQL token not configured" }, 503);
  }
  const scheme = Deno.env.get("TVDOUTOR_GRAPHQL_AUTH_SCHEME")?.trim() || "token";
  const endpoint = Deno.env.get("TVDOUTOR_GRAPHQL_ENDPOINT")?.trim() || "https://app.tvdoutor.com.br/graphql";
  const pageSize = 100;
  const maxPages = 15;

  try {
    let after: string | null = null;
    for (let page = 0; page < maxPages; page++) {
      const players = await graphqlFetch(endpoint, gqlToken, scheme, {
        first: pageSize,
        after,
      });
      const nodes = (players.nodes || []) as Array<{
        id: string;
        name: string;
        isConnected?: boolean;
        lastSeen?: string | null;
        lastSync?: string | null;
        syncProgress?: number | null;
      }>;
      for (const p of nodes) {
        const vc = extractVenueCode(p.name);
        if (!vc || !matchesCode(vc, code)) continue;
        const now = new Date().toISOString();
        const row = {
          player_id: p.id,
          player_name: p.name,
          venue_code: vc,
          is_connected: !!p.isConnected,
          last_seen: p.lastSeen ?? null,
          last_sync: p.lastSync ?? null,
          sync_progress: p.syncProgress ?? null,
          fetched_at: now,
        };
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { error } = await supabase
          .from("tvd_player_status")
          .upsert(row, { onConflict: "player_id" });
        if (error) {
          console.error("tvd-verify-sync-player: upsert error", error);
          return json({ found: true, error: error.message }, 500);
        }
        return json({
          found: true,
          player_id: row.player_id,
          venue_code: row.venue_code,
          is_connected: row.is_connected,
          last_seen: row.last_seen,
          sync_progress: row.sync_progress,
        }, 200);
      }
      const hasNext = players.pageInfo?.hasNextPage === true;
      const nextCursor = players.pageInfo?.endCursor;
      if (!hasNext || !nextCursor) break;
      after = nextCursor;
    }
    return json({ found: false }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("tvd-verify-sync-player: error", msg);
    return json({ found: false, error: msg }, 200);
  }
});
