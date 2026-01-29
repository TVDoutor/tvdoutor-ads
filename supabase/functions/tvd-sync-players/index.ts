/**
 * Edge Function: tvd-sync-players
 *
 * Sincroniza status dos players do app.tvdoutor.com.br (GraphQL) para a tabela
 * tvd_player_status no Supabase. Deve ser chamada por cron (ex.: a cada 2 min).
 *
 * Segurança: exige header x-cron-secret = TVD_SYNC_CRON_SECRET.
 * Secrets: TVDOUTOR_GRAPHQL_TOKEN, TVD_SYNC_CRON_SECRET.
 *
 * Token (TVDOUTOR_GRAPHQL_TOKEN): API Access Token do app.tvdoutor (Settings →
 * API Access Tokens). O token precisa ter escopos content:read e player:read
 * para acessar organization { players }. Sem isso → "Authentication is required
 * to access organization field".
 *
 * Requisição: POST, Content-Type: application/json, Authorization: token <token>
 * (o Playground usa "token", não "Bearer"). Endpoint: https://app.tvdoutor.com.br/graphql.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

/** Query conforme doc: organization.players com orderBy LAST_SEEN_AT, campos lastSeen, lastSync, isConnected, syncProgress. */
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
  const m = name.trim().toUpperCase().match(/^(P\d+(?:\.\d+)*)\b/);
  return m?.[1] ?? null;
}

function buildAuthHeaders(
  token: string,
  authScheme: string
): Record<string, string> {
  const t = token.trim();
  const s = (authScheme || "token").toLowerCase();
  if (s === "x-api-key") {
    return { "X-API-Key": t };
  }
  if (s === "bearer") {
    return { Authorization: `Bearer ${t}` };
  }
  return { Authorization: `token ${t}` };
}

async function graphqlFetch(
  endpoint: string,
  token: string,
  authScheme: string,
  variables: { first: number; after?: string | null },
  retries = 3
): Promise<{ pageInfo?: { hasNextPage?: boolean; endCursor?: string | null }; nodes: unknown[] }> {
  const auth = buildAuthHeaders(token, authScheme);
  const vars: { first: number; after?: string } = { first: variables.first };
  if (variables.after != null && variables.after !== "") {
    vars.after = variables.after;
  }
  let lastErr: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15_000);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...auth,
        },
        body: JSON.stringify({ query: GRAPHQL_QUERY, variables: vars }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
      const json = await res.json();
      if (json.errors?.length) throw new Error(JSON.stringify(json.errors));
      const players = json.data?.organization?.players;
      if (!players) throw new Error("Missing organization.players in response");
      return players;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (i < retries - 1) {
        const ms = Math.min(300 * Math.pow(2, i) + Math.random() * 200, 3000);
        await new Promise((r) => setTimeout(r, ms));
      }
    }
  }
  throw lastErr ?? new Error("GraphQL request failed");
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

  try {
    const cronSecret = Deno.env.get("TVD_SYNC_CRON_SECRET") ?? "";
    const got = req.headers.get("x-cron-secret") ?? "";
    if (!cronSecret || got !== cronSecret) {
      console.warn("tvd-sync-players: missing or invalid x-cron-secret");
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const rawToken = Deno.env.get("TVDOUTOR_GRAPHQL_TOKEN");
    const token = rawToken?.trim() ?? "";
    if (!token) {
      console.error("tvd-sync-players: TVDOUTOR_GRAPHQL_TOKEN not set");
      return json({ ok: false, error: "TVDOUTOR_GRAPHQL_TOKEN not configured" }, 500);
    }
    const authScheme =
      Deno.env.get("TVDOUTOR_GRAPHQL_AUTH_SCHEME")?.trim() || "token";

    const endpoint =
      Deno.env.get("TVDOUTOR_GRAPHQL_ENDPOINT")?.trim() ||
      "https://app.tvdoutor.com.br/graphql";
    const pageSize = Math.min(
      Math.max(1, Number(Deno.env.get("TVD_SYNC_PAGE_SIZE")) || 100),
      500
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let after: string | null = null;
    let total = 0;

    for (;;) {
      const players = await graphqlFetch(endpoint, token, authScheme, {
        first: pageSize,
        after,
      });

      const now = new Date().toISOString();
      const rows = (players.nodes as Array<{
        id: string;
        name: string;
        isConnected?: boolean;
        lastSeen?: string | null;
        lastSync?: string | null;
        syncProgress?: number | null;
      }>).map((p) => ({
        player_id: p.id,
        player_name: p.name,
        venue_code: extractVenueCode(p.name),
        is_connected: !!p.isConnected,
        last_seen: p.lastSeen ?? null,
        last_sync: p.lastSync ?? null,
        sync_progress: p.syncProgress ?? null,
        fetched_at: now,
      }));

      if (rows.length) {
        const { error } = await supabase
          .from("tvd_player_status")
          .upsert(rows, { onConflict: "player_id" });
        if (error) {
          console.error("tvd-sync-players: upsert error", error);
          throw error;
        }
      }

      total += rows.length;

      const hasNext = players.pageInfo?.hasNextPage === true;
      const nextCursor = players.pageInfo?.endCursor;
      if (!hasNext || !nextCursor) break;
      after = nextCursor;
    }

    console.log("tvd-sync-players: ok, total=", total);
    return json({ ok: true, total }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("tvd-sync-players: error", msg);
    return json({ ok: false, error: msg }, 500);
  }
});
