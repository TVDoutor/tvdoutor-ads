// Deno Deploy / Supabase Edge Function: user-sessions
// Provides secure access (service role) to user session data for super admins only.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Service client (bypasses RLS)
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type Action = "online" | "history" | "cleanup";

serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("", { headers: corsHeaders });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // Validate user and ensure super_admin
    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await authed.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Check super_admin via profiles or user_roles
    const { data: profile } = await admin
      .from("profiles")
      .select("id, super_admin")
      .eq("id", user.id)
      .single();
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isSuper = profile?.super_admin === true || (roles || []).some((r) => r.role === "super_admin");
    if (!isSuper) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as {
      action?: Action;
      startDate?: string;
      endDate?: string;
      searchTerm?: string;
    };
    const action: Action = body.action || "online";

    if (action === "cleanup") {
      const { data, error } = await admin.rpc("cleanup_expired_sessions");
      if (error) return json({ error: error.message }, 500);
      return json({ cleaned: data || 0 });
    }

    if (action === "online") {
      const nowISO = new Date().toISOString();
      const { data: sessions, error } = await admin
        .from("user_sessions")
        .select("user_id, started_at, last_seen_at, ip_address, user_agent, expires_at, is_active")
        .eq("is_active", true)
        .gt("expires_at", nowISO);
      if (error) return json({ error: error.message }, 500);

      const userIds = Array.from(new Set((sessions || []).map((s) => s.user_id).filter(Boolean)));
      const profilesMap = new Map<string, { email: string; full_name: string }>();
      if (userIds.length) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);
        for (const p of profiles || []) profilesMap.set(p.id, { email: p.email, full_name: p.full_name });
      }

      const sessions_data = (sessions || []).map((s) => {
        const profile = profilesMap.get(s.user_id) || { email: "", full_name: "" };
        const started = s.started_at || s.last_seen_at || new Date().toISOString();
        const duration_minutes = Math.max(0, Math.floor((Date.now() - new Date(started).getTime()) / 60000));
        return {
          user_id: s.user_id,
          email: profile.email,
          full_name: profile.full_name,
          started_at: started,
          last_seen_at: s.last_seen_at || started,
          duration_minutes,
          ip_address: s.ip_address,
          user_agent: s.user_agent,
        };
      });
      return json({ total_online: sessions_data.length, sessions_data });
    }

    if (action === "history") {
      const startISO = body.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endISO = body.endDate || new Date().toISOString();

      const { data: history, error } = await admin
        .from("user_session_history")
        .select("user_id, started_at, ended_at, duration_minutes, ended_by, ip_address, user_agent")
        .gte("started_at", startISO)
        .lte("started_at", endISO)
        .order("started_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);

      const userIds = Array.from(new Set((history || []).map((h) => h.user_id).filter(Boolean)));
      const profilesMap = new Map<string, { email: string; full_name: string }>();
      if (userIds.length) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);
        for (const p of profiles || []) profilesMap.set(p.id, { email: p.email, full_name: p.full_name });
      }

      let result = (history || []).map((h) => {
        const profile = profilesMap.get(h.user_id) || { email: "", full_name: "" };
        return { ...h, email: profile.email, full_name: profile.full_name };
      });

      const term = (body.searchTerm || "").trim().toLowerCase();
      if (term) {
        result = result.filter((s) =>
          (s.email && s.email.toLowerCase().includes(term)) ||
          (s.full_name && s.full_name.toLowerCase().includes(term))
        );
      }

      return json(result);
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}


