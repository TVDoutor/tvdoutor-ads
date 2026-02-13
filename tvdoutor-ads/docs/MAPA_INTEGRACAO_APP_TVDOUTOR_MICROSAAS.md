# Mapeamento: Integração app.tvdoutor ↔ Micro SaaS (TVDoutor ADS)

Documento de referência do que foi implementado desde o início da integração entre **app.tvdoutor.com.br** (GraphQL) e o **micro SaaS** (TVDoutor ADS), incluindo banco, Edge Functions, frontend e correções.

---

## 1. Visão geral

| Aspecto | app.tvdoutor.com.br | Micro SaaS (TVDoutor ADS) |
|--------|----------------------|----------------------------|
| **Papel** | Fonte de verdade para status de players (conexão, sincronia) | Consome status para Inventário e Dashboard |
| **API** | GraphQL `https://app.tvdoutor.com.br/graphql` | Supabase (Postgres, Auth, Edge Functions) |
| **Autenticação** | `Authorization: token <API_ACCESS_TOKEN>` | JWT Supabase (anon/authenticated), service role nas funções |

**Fluxo:**

1. **Cron** chama a Edge Function **tvd-sync-players** (com `x-cron-secret`).
2. **tvd-sync-players** consulta o GraphQL do app.tvdoutor (`organization.players`), extrai `venue_code` do `name` (ex.: P2000.01) e faz **upsert** na tabela **tvd_player_status** no Supabase.
3. Ao **adicionar uma tela** no Inventário, o frontend chama **tvd-verify-sync-player** com o código do ponto. A função verifica se existe player no app.tvdoutor para esse código e, se existir, faz upsert em `tvd_player_status` (sincronização imediata).
4. O **frontend** lê `tvd_player_status` via:
   - **Edge Function tvd-player-status** (service role, JWT validado manualmente), ou
   - **Fallback**: query direta à tabela (RLS + GRANT para anon/authenticated).
5. **Inventário**: coluna **Conexão (TVD)** exibe Online/Offline, `last_seen`, `sync_progress`.
6. **Dashboard**: alertas **Equipamentos offline > 24h** com base em `tvd_player_status`; ao **Resolver**, redireciona para `/inventory`.

---

## 2. app.tvdoutor.com.br (GraphQL)

- **Endpoint:** `https://app.tvdoutor.com.br/graphql`
- **Método:** `POST`, `Content-Type: application/json`
- **Auth:** `Authorization: token <API_ACCESS_TOKEN>`
- **Onde criar token:** Settings → API Access Tokens. Escopos necessários: **content:read**, **player:read** (para `organization { players }`).

**Query usada (tvd-sync-players):**

```graphql
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
```

**Campos relevantes:**

| Campo | Uso |
|-------|-----|
| `id` | `player_id` em `tvd_player_status` |
| `name` | Extração de `venue_code` (ex.: P2000.01); também `player_name` |
| `isConnected` | `is_connected` |
| `lastSeen` | `last_seen` |
| `lastSync` | `last_sync` |
| `syncProgress` | `sync_progress` |

**Documentação interna:** `docs/TVDOUTOR_GRAPHQL.md`

---

## 3. Banco de dados (Supabase / Postgres)

### 3.1 Tabela `tvd_player_status`

Cache do status dos players no Supabase. Populada pela **tvd-sync-players**; lida pela **tvd-player-status** e pelo frontend (fallback).

**Colunas (uso atual):**

| Coluna | Tipo | Origem | Uso |
|--------|------|--------|-----|
| `player_id` | text (PK) | GraphQL `id` | Upsert `onConflict` |
| `player_name` | text | GraphQL `name` | Exibição |
| `venue_code` | text | `extractVenueCode(name)` | Cruza com `screens.code` no Inventário |
| `is_connected` | bool | GraphQL `isConnected` | Online/Offline |
| `last_seen` | timestamptz | GraphQL `lastSeen` | Última conexão, alertas offline > 24h |
| `last_sync` | timestamptz | GraphQL `lastSync` | Sincronia |
| `sync_progress` | int | GraphQL `syncProgress` | % sync |
| `fetched_at` | timestamptz | Gerado no sync | Auditoria |

**`venue_code`:** extraído do `name` com `^(P\d+(?:\.\d+)*)\b` (ex.: P2000, P2000.01). No app.tvdoutor há zeros à esquerda (P2000.01); no Inventário às vezes não (P2000.1). O frontend normaliza nas duas direções.

### 3.2 RLS e permissões

| Migração | Conteúdo |
|----------|----------|
| `20260129000000_tvd_player_status_rls.sql` | RLS em `tvd_player_status`; policy `tvd_player_status_select_authenticated` (SELECT para `authenticated`) |
| `20260129000001_tvd_player_status_anon_select.sql` | Policy `tvd_player_status_select_anon` (SELECT para `anon`) — fallback quando a requisição roda como anon |
| `20260129000002_tvd_player_status_grants.sql` | `GRANT SELECT ON public.tvd_player_status TO anon, authenticated` — evita 42501 "permission denied" |

---

## 4. Edge Functions (Supabase)
image.png
### 4.1 `tvd-sync-players`

- **Objetivo:** Buscar players no GraphQL (app.tvdoutor) e fazer upsert em `tvd_player_status`.
- **Trigger:** Cron (ex.: a cada 2 min) chamando a URL da função com header `x-cron-secret: <TVD_SYNC_CRON_SECRET>`.
- **Config:** `verify_jwt = false` (acesso via cron secret).

**Secrets:**

| Secret | Uso |
|--------|-----|
| `TVDOUTOR_GRAPHQL_TOKEN` | API Access Token do app.tvdoutor |
| `TVD_SYNC_CRON_SECRET` | Valor esperado em `x-cron-secret` |
| `TVDOUTOR_GRAPHQL_AUTH_SCHEME` | (opcional) `token` \| `bearer` \| `x-api-key`; default `token` |
| `TVDOUTOR_GRAPHQL_ENDPOINT` | (opcional) default `https://app.tvdoutor.com.br/graphql` |
| `TVD_SYNC_PAGE_SIZE` | (opcional) default 100, max 500 |

**Arquivo:** `supabase/functions/tvd-sync-players/index.ts`

### 4.2 `tvd-verify-sync-player`

- **Objetivo:** Ao **adicionar uma tela** no Inventário, verificar se existe player no app.tvdoutor para o código e, se existir, fazer upsert em `tvd_player_status` (sincronizar).
- **Trigger:** Frontend chama após "Adicionar Tela" com sucesso, enviando `{ code: string }` (código do ponto).
- **Config:** `verify_jwt = false`; JWT validado manualmente no POST.

**Fluxo:**

1. POST com `{ code }` e JWT válido.
2. Busca em `organization.players` (GraphQL), paginando, até achar player cujo `extractVenueCode(name)` casa com `code` (incluindo normalização P2000.1 ↔ P2000.01).
3. Se achar: upsert em `tvd_player_status`, retorna `{ found: true, player_id, venue_code, is_connected, last_seen, ... }`.
4. Se não achar (ou erro não crítico): retorna `{ found: false }`.

**Secrets:** `TVDOUTOR_GRAPHQL_TOKEN`, opcionalmente `TVDOUTOR_GRAPHQL_AUTH_SCHEME` e `TVDOUTOR_GRAPHQL_ENDPOINT`.

**Arquivo:** `supabase/functions/tvd-verify-sync-player/index.ts`

### 4.3 `tvd-player-status`

- **Objetivo:** Ler `tvd_player_status` via **service role** (contorna RLS) e devolver JSON para o Inventário.
- **Chamada:** Frontend `supabase.functions.invoke('tvd-player-status', { body: { venue_codes } })` com JWT no `Authorization`.
- **Config:** `verify_jwt = false` para o preflight **OPTIONS** passar (CORS). JWT validado **manual** no POST com `auth.getUser(token)`.

**Fluxo:**

1. `OPTIONS` → 204 + CORS.
2. `POST` sem `Authorization` ou token inválido → 401.
3. `POST` com JWT válido → query em `tvd_player_status` (service role), batch por `venue_code` (até 200 por vez) → `{ data: [...] }`.

**Arquivo:** `supabase/functions/tvd-player-status/index.ts`

---

## 5. Frontend (Micro SaaS)

### 5.1 Inventário — "Adicionar Tela" e verificação no app.tvdoutor

- **Onde:** `src/pages/Inventory.tsx`, `handleAddScreen`.
- Após inserir a tela (admin ou direto), o frontend chama a Edge Function **`tvd-verify-sync-player`** com o **código do ponto** da nova tela.
- A função verifica no app.tvdoutor (GraphQL) se existe player para esse código e, se existir, faz upsert em `tvd_player_status`.
- **Toasts:**
  - Sempre: "Tela adicionada com sucesso!".
  - Se `found: true`: "Tela encontrada no app.tvdoutor e status de conexão sincronizado.".
  - Se `found: false`: "Código não encontrado no app.tvdoutor. Verifique o código do ponto se precisar da coluna Conexão (TVD).".
  - Se falha na chamada (rede, 503, etc.): "Não foi possível verificar no app.tvdoutor. Tente novamente mais tarde.".
- Após a verificação, o frontend invalida a query `tvd-player-status` para atualizar a coluna Conexão (TVD).

### 5.2 Inventário — coluna "Conexão (TVD)"

- **Onde:** `src/pages/Inventory.tsx`
- **Hook:** `useTvdPlayerStatus(venueCodes)` em `src/hooks/useTvdPlayerStatus.ts`

**Fluxo:**

1. `venueCodes` = `[...new Set(filteredScreens.map(s => s.code).filter(Boolean))]`.
2. Gera também códigos em formato TVD (ex.: P2000.1 → P2000.01) para busca.
3. **Tenta** `tvd-player-status` (Edge Function).
4. **Se falhar** (CORS, rede, 401, etc.): **fallback** para query direta em `tvd_player_status` (Supabase client).
5. Monta mapa `venue_code` → `{ is_connected, last_seen, sync_progress, ... }` com **aliases** para formato Inventário (P2000.01 → P2000.1) e formata na UI: Online/Offline, `last_seen` (dd/MM HH:mm), Sync %.
6. **Alertas:**  
   - Vermelho: erro ao carregar (ex.: função não deployada, sem login).  
   - Âmbar: sucesso na busca, mas mapa vazio (tabela vazia ou sem match) → orienta rodar sync e checar `tvd_player_status`.

### 5.3 Normalização de códigos (P2000.1 ↔ P2000.01)

- **Problema:** app.tvdoutor usa P2000.01, P2000.04; Inventário usa P2000.1, P2000.4.
- **Funções em `useTvdPlayerStatus`:**  
  - `toTvdFormat`: P2000.1 → P2000.01.  
  - `toInventoryFormat`: P2000.01 → P2000.1.  
- **Uso:** Na busca, envia inventário + TVD; no mapa, indexa por ambos para lookup por `screen.code`.

### 5.4 Dashboard — alertas "Equipamentos offline > 24h"

- **Hook:** `useRealAlerts` → `getPlayerOffline24hAlerts()` em `src/hooks/useRealAlerts.ts`.
- **Critério:** `last_seen IS NULL` OU `last_seen < now() - 24h` em `tvd_player_status`.
- **Exibição:** `AlertQueue` com categoria `player_offline`, ícone `WifiOff`.
- **Resolver:** `useAlertActions` → `resolveAlert` para `player_offline` redireciona para **`/inventory`**.
- **Dispensar:** persiste IDs em `localStorage` (`tvd-dashboard-dismissed-alerts`) para não reaparecer após refresh.

### 5.5 Outros ajustes relacionados (Dashboard / telas)

- **Screens:** Uso de `name`, `display_name`, `address_raw`, `city`, `state` em alertas de telas inativas (sem `location` / `venue_name`).
- **TrendChart:** Tratamento de 1 ponto e max 0 para evitar NaN em `cx`/`cy`/`polyline`.
- **Alertas “Agências sem contatos”:** Resolver redireciona para **`/gerenciamento-projetos`** (não `/settings`).
- **CSP (Vite):** `connect-src` inclui `https://*.supabase.co`, `https://vaogzhwzucijiyvyglls.supabase.co` e `http://192.168.96.1:*` para dev.

---

## 6. Scripts e verificações

| Script | Uso |
|--------|-----|
| `scripts/sql-offline-24h.sql` | Contagem e lista de players offline > 24h em `tvd_player_status` |
| `scripts/sql-verify-tvd-player-status.sql` | Contagens, amostra de `venue_code` e checagem para códigos P2000* |
| `scripts/graphql-players-query.json` | Exemplo de query GraphQL para testes com `curl` |

---

## 7. Resumo de arquivos alterados/criados

| Arquivo | Descrição |
|---------|-----------|
| `docs/TVDOUTOR_GRAPHQL.md` | Doc da API GraphQL (auth, header, query, permissões) |
| `docs/MAPA_INTEGRACAO_APP_TVDOUTOR_MICROSAAS.md` | Este mapeamento |
| `supabase/functions/tvd-sync-players/index.ts` | Sync GraphQL → `tvd_player_status` |
| `supabase/functions/tvd-player-status/index.ts` | Leitura via service role para Inventário |
| `supabase/functions/tvd-verify-sync-player/index.ts` | Verificar no app.tvdoutor + upsert 1 em `tvd_player_status` ao adicionar tela |
| `supabase/config.toml` | `[functions.tvd-sync-players]`, `[functions.tvd-player-status]`, `[functions.tvd-verify-sync-player]` |
| `supabase/migrations/20260129000000_tvd_player_status_rls.sql` | RLS + policy authenticated |
| `supabase/migrations/20260129000001_tvd_player_status_anon_select.sql` | Policy anon |
| `supabase/migrations/20260129000002_tvd_player_status_grants.sql` | GRANT SELECT |
| `src/hooks/useTvdPlayerStatus.ts` | Busca status (Edge Function + fallback), normalização P-codes |
| `src/hooks/useRealAlerts.ts` | Alertas offline > 24h, `getPlayerOffline24hAlerts` |
| `src/hooks/useAlertActions.ts` | Resolver/Dispensar; redirect `player_offline` → `/inventory`; localStorage para dispensados |
| `src/pages/Inventory.tsx` | Coluna Conexão (TVD), alertas de erro/âmbar, `useTvdPlayerStatus` |
| `src/components/dashboard/AlertQueue.tsx` | Ícone `player_offline` (WifiOff), fallback de ícones |
| `vite.config.ts` | CSP `connect-src` (Supabase, 192.168.96.1) |
| `scripts/sql-offline-24h.sql` | Queries offline > 24h |
| `scripts/sql-verify-tvd-player-status.sql` | Verificação de `tvd_player_status` |
| `scripts/graphql-players-query.json` | Exemplo GraphQL para testes |

---

## 8. Checklist operacional

- [ ] **API Access Token** em app.tvdoutor com `content:read` e `player:read`.
- [ ] **Secrets** no Supabase: `TVDOUTOR_GRAPHQL_TOKEN`, `TVD_SYNC_CRON_SECRET`; opcionalmente `TVDOUTOR_GRAPHQL_AUTH_SCHEME`, `TVDOUTOR_GRAPHQL_ENDPOINT`, `TVD_SYNC_PAGE_SIZE`.
- [ ] **Migrações** aplicadas (RLS, anon, GRANTs).
- [ ] **Deploy** das Edge Functions: `tvd-sync-players`, `tvd-player-status`, `tvd-verify-sync-player`.
- [ ] **Cron** configurado para chamar `tvd-sync-players` com `x-cron-secret` (ex.: Vercel Cron, ou outro agendador).
- [ ] **Tabela** `tvd_player_status` existe e está sendo populada pelo sync (validar com `scripts/sql-verify-tvd-player-status.sql`).

---

*Última atualização: conforme implementação concluída até a exibição da coluna Conexão (TVD) no Inventário e alertas de offline > 24h no Dashboard.*
