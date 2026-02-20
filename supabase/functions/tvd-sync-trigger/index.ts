/**
 * Edge Function: tvd-sync-trigger
 *
 * Permite que admins acionem o sync TVD pela interface.
 * Valida JWT + role admin, depois chama tvd-sync-players com o secret.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

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

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: dbRole } = await supabase.rpc("get_user_role", { _user_id: user.id });
  if (!dbRole || (dbRole !== "admin" && dbRole !== "super_admin")) {
    return json({ error: "Acesso negado. Apenas administradores podem sincronizar." }, 403);
  }

  const cronSecret = Deno.env.get("TVD_SYNC_CRON_SECRET") ?? "";
  if (!cronSecret) {
    return json({ error: "TVD_SYNC_CRON_SECRET não configurado no servidor" }, 503);
  }

  const syncUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/tvd-sync-players`;
  const res = await fetch(syncUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": cronSecret,
    },
    body: JSON.stringify({}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return json({ ok: false, error: data?.error || res.statusText }, res.status);
  }
  return json(data, 200);
});
