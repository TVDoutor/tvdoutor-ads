import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TvdPlayerStatusItem {
  player_id: string;
  player_name: string | null;
  venue_code: string | null;
  is_connected: boolean;
  last_seen: string | null;
  last_sync: string | null;
  sync_progress: number | null;
  fetched_at: string;
}

export type TvdStatusMap = Record<string, TvdPlayerStatusItem>;

/**
 * Formato TVD: P2000.01, P3348.F04.03, P3348.F04.1 (alfanumérico).
 * Inventário: P2000.1, P3348.F04.3, P3348.F04.1 (sem zero à esquerda no último segmento).
 */

/** P2000.1 → P2000.01; P3348.F04.3 → P3348.F04.03 (pad último segmento numérico) */
function toTvdFormat(code: string): string {
  const m = String(code).trim().match(/^(P\d+)\.(\d+)$/i);
  if (!m) return code;
  return `${m[1]}.${m[2].padStart(2, '0')}`;
}

/** Gera variantes para query: P3348.F04.3 → [P3348.F04.3, P3348.F04.03] */
function getQueryVariants(code: string): string[] {
  const s = String(code).trim();
  const parts = s.split('.');
  if (parts.length < 2) return [s];
  const last = parts[parts.length - 1];
  if (/^\d+$/.test(last) && last.length <= 2) {
    const padded = last.padStart(2, '0');
    if (padded !== last) {
      const variant = [...parts.slice(0, -1), padded].join('.');
      return [s, variant];
    }
  }
  return [s];
}

/** P2000.01 → P2000.1; P3348.F04.03 → P3348.F04.3 (remove zeros à esquerda no último segmento) */
function toInventoryFormat(code: string): string {
  const s = String(code).trim();
  const parts = s.split('.');
  if (parts.length < 2) return s;
  const last = parts[parts.length - 1];
  const trimmed = /^0*(\d+)$/.test(last) ? last.replace(/^0+/, '') || '0' : last;
  if (trimmed !== last) {
    return [...parts.slice(0, -1), trimmed].join('.');
  }
  return s;
}

/**
 * Busca status dos players (tvd_player_status) por venue_code.
 * Cruza screen.code (inventário) com venue_code (TVD); normaliza P2000.1 ↔ P2000.01.
 */
export function useTvdPlayerStatus(venueCodes: string[]) {
  const raw = [...new Set(venueCodes.filter(Boolean))];
  const variants = raw.flatMap((c) => [...getQueryVariants(c), toTvdFormat(c)]);
  const codes = [...new Set(variants)];

  return useQuery({
    queryKey: ['tvd-player-status', codes.sort().join(',')],
    queryFn: async (): Promise<TvdStatusMap> => {
      if (codes.length === 0) return {};

      const buildMap = (rows: Array<Record<string, unknown>>): TvdStatusMap => {
        const map: TvdStatusMap = {};
        rows.forEach((row) => {
          const vc = row.venue_code as string | null;
          if (!vc) return;
          const item = {
            player_id: row.player_id,
            player_name: row.player_name,
            venue_code: vc,
            is_connected: !!row.is_connected,
            last_seen: row.last_seen as string | null,
            last_sync: row.last_sync as string | null,
            sync_progress: row.sync_progress as number | null,
            fetched_at: row.fetched_at as string,
          } as TvdPlayerStatusItem;
          map[vc] = item;
          const inv = toInventoryFormat(vc);
          if (inv !== vc) map[inv] = item;
        });
        return map;
      };

      let lastErr: unknown = null;

      try {
        const { data: res, error } = await supabase.functions.invoke('tvd-player-status', {
          body: { venue_codes: codes },
        });
        if (!error) {
          const payload = res as { data?: unknown[]; error?: string } | null;
          const rows = Array.isArray(payload?.data) ? payload.data : [];
          if (!payload?.error || rows.length > 0) {
            if (import.meta.env.DEV && codes.length > 0) {
              console.log(`🔌 TVD status (Edge Function): ${codes.length} códigos, ${rows.length} linhas`);
            }
            return buildMap(rows as Array<Record<string, unknown>>);
          }
        }
        lastErr = error;
      } catch (e) {
        lastErr = e;
        if (import.meta.env.DEV) {
          console.warn('⚠️ useTvdPlayerStatus: Edge Function falhou, tentando tabela direta:', e);
        }
      }

      const BATCH = 200;
      const map: TvdStatusMap = {};
      let totalRows = 0;
      for (let i = 0; i < codes.length; i += BATCH) {
        const batch = codes.slice(i, i + BATCH);
        const { data, error } = await supabase
          .from('tvd_player_status')
          .select('player_id, player_name, venue_code, is_connected, last_seen, last_sync, sync_progress, fetched_at')
          .in('venue_code', batch);
        if (error) {
          console.warn('⚠️ useTvdPlayerStatus:', error);
          throw lastErr ?? error;
        }
        const rows = (data || []) as Array<Record<string, unknown>>;
        totalRows += rows.length;
        Object.assign(map, buildMap(rows));
      }
      if (import.meta.env.DEV && codes.length > 0) {
        console.log(`🔌 TVD status (tabela direta): ${codes.length} códigos, ${totalRows} linhas, ${Object.keys(map).length} chaves`);
      }
      return map;
    },
    enabled: codes.length > 0,
    staleTime: 1 * 60 * 1000,
    gcTime: 3 * 60 * 1000,
  });
}
