# Plano de implementação: Raio farmácia + Farmácias por especialidade

Este documento descreve o que é necessário para implementar:

1. **Venues (e telas) no raio de farmácia** – Filtrar por “venues que têm pelo menos uma farmácia a até X km” (1, 2, 3, 4 km) no **mapa interativo**, **nova proposta** e **relatório**.
2. **Farmácias × categoria (especialidade)** – Exemplo: “Quantas farmácias existem em um raio X de venues que têm a especialidade Dermatologia?” (relatório / filtros).

---

## Visão geral

| Camada        | O que fazer |
|---------------|-------------|
| **Banco**     | Garantir view de distância venue–farmácia; criar RPCs (ou views) para “venue_ids no raio” e “farmácias por especialidade + raio”. |
| **Serviço**   | Funções no front que chamam as RPCs/views e expõem dados para os componentes. |
| **UI**        | Filtros no mapa, na seleção de telas da proposta e nova seção no relatório. |

---

## 1. Banco de dados

### 1.1 View de distância venue–farmácia

- **Nome:** `mv_venue_farmacia_distancia` (ou view com o mesmo contrato).
- **Uso atual:** `pharmacy-service.ts` já consulta essa estrutura (`venue_id`, `nome_venue`, `farmacia_id`, `nome_farmacia`, `distancia_km`, etc.).
- **Implementado na migration** `supabase/migrations/20260212000000_venue_farmacia_distancia_and_rpcs.sql`:
  - Função `haversine_km` para distância em km.
  - **View** `mv_venue_farmacia_distancia`: pares venue–farmácia com distância ≤ 30 km (para limitar tamanho).
  - Usa `venues` (lat/lng) e `farmacias` (lat/lng ou latitude/longitude); ignora pares sem coordenadas.
  - **Nota:** Se no seu ambiente já existir essa view com outra definição (ex.: sem limite de 30 km), ajuste a migration ou mantenha a view existente e crie só as RPCs.

### 1.2 RPCs (ou views) para a aplicação

**A) Venue IDs com farmácia dentro de um raio**

- **Nome sugerido:** `get_venue_ids_with_pharmacy_in_radius(radius_km double precision)`.
- **Retorno:** array ou tabela de `venue_id` onde existe ao menos uma farmácia a distância ≤ `radius_km`.
- **Uso:** filtrar telas no mapa, na nova proposta e no relatório (manter só telas cujo `venue_id` está nesse conjunto).

**B) Farmácias por especialidade e raio**

- **Nome sugerido:** `get_pharmacy_count_by_specialty_and_radius(specialty text, radius_km double precision)`.
- **Lógica:**
  - Venues que têm pelo menos uma tela com essa especialidade: `SELECT DISTINCT venue_id FROM screens WHERE active = true AND specialty @> ARRAY[specialty] AND venue_id IS NOT NULL`.
  - Juntar com `mv_venue_farmacia_distancia` com `distancia_km <= radius_km`.
  - Retornar `COUNT(DISTINCT farmacia_id)` e, se útil, lista de farmácias (id, nome, distancia_km).
- **Uso:** relatório “Farmácias × especialidade × raio” e possíveis filtros.

**C) Relatório agregado (opcional)**

- **Nome sugerido:** `get_venues_by_pharmacy_radius_summary(radii_km double precision[])`.
- **Retorno:** para cada valor em `radii_km`, quantidade de venues (e opcionalmente de telas) com farmácia no raio.
- **Uso:** card no relatório “Venues por proximidade de farmácia” (ex.: 1 km, 2 km, 3 km, 4 km).

As RPCs estão implementadas na mesma migration com os nomes e retornos descritos acima.

---

## 2. Camada de serviço (frontend)

### 2.1 Serviço: `src/lib/venue-pharmacy-radius-service.ts` (criado)

- **getVenueIdsWithPharmacyInRadius(radiusKm: number): Promise<number[]>**  
  Chama a RPC `get_venue_ids_with_pharmacy_in_radius` e retorna lista de `venue_id`.

- **getPharmacyCountBySpecialtyAndRadius(specialty: string, radiusKm: number): Promise<PharmacyCountBySpecialtyResult>**  
  Chama a RPC `get_pharmacy_count_by_specialty_and_radius`; retorna contagem e lista de farmácias.

- **getVenuesByPharmacyRadiusSummary(radiiKm?: number[]): Promise<VenuesByPharmacyRadiusRow[]>**  
  Chama a RPC `get_venues_by_pharmacy_radius_summary` para popular o relatório (venue_count e screen_count por raio).

### 2.2 Integração com dados existentes

- **Mapa e nova proposta:** depois de carregar telas (de `screens` ou `v_screens_enriched`), filtrar por `venue_id in (await getVenueIdsWithPharmacyInRadius(raioEscolhido))`.
- **Relatório:** usar as RPCs acima para preencher tabelas/gráficos e, se houver filtro global “só telas em venues com farmácia a X km”, usar a mesma lista de `venue_id` para filtrar as telas do heatmap/KPIs (se desejado).

---

## 3. Interface (UI)

### 3.1 Mapa interativo (`/mapa-interativo`)

- Adicionar controle “Raio farmácia” (ex.: select com 1, 2, 3, 4 km e opção “Todos”).
- Ao selecionar um raio: chamar `getVenueIdsWithPharmacyInRadius(raio)` e filtrar a lista de telas/venues exibidas no mapa (`venue_id` no conjunto retornado).
- Manter o restante do comportamento (camadas, busca por endereço, etc.) inalterado.

### 3.2 Nova proposta – seleção de telas (`/nova-proposta`)

- Na etapa de seleção de telas, adicionar filtro (ou aba) “Com farmácia a até X km”.
- Opções de raio: 1, 2, 3, 4 km (ou igual ao mapa).
- Ao ativar: buscar `getVenueIdsWithPharmacyInRadius(X)` e filtrar a lista de telas já carregada de `v_screens_enriched`/`screens` por `venue_id in (...)`.
- Opcional: filtro adicional por “Especialidade” (ex.: Dermatologia); aí a lista de venues pode vir de uma variante da RPC que considera especialidade (ou filtrar no front as telas por especialidade e depois por venue no raio).

### 3.3 Relatório (`/reports`)

- **Seção “Venues por proximidade de farmácia”:** tabela ou cards com colunas “Raio (km)” e “Quantidade de venues” (e, se disponível, “Telas”). Fonte: `get_venues_by_pharmacy_radius_summary` ou chamadas a `get_venue_ids_with_pharmacy_in_radius` para cada raio.
- **Seção “Farmácias por especialidade e raio”:** tabela com colunas “Especialidade”, “Raio (km)”, “Quantidade de farmácias”. Fonte: `get_pharmacy_count_by_specialty_and_radius` para combinações desejadas (ex.: Dermatologia + 1, 2, 3, 4 km).
- Opcional: filtro global “Considerar apenas telas em venues com farmácia a até X km” para as métricas já existentes (heatmap, KPIs), usando a mesma lista de `venue_id`.

---

## 4. Ordem sugerida de implementação

1. **Migration** – Garantir view `mv_venue_farmacia_distancia` e criar as RPCs (e, se fizer sentido, a view de resumo) no Supabase.
2. **Serviço** – Implementar `venue-pharmacy-radius-service.ts` e testar as RPCs (por exemplo via console ou tela de debug).
3. **Mapa** – Adicionar filtro “Raio farmácia” e aplicar filtro por `venue_id`.
4. **Nova proposta** – Adicionar filtro (ou aba) “Com farmácia a até X km” na seleção de telas.
5. **Relatório** – Adicionar as duas seções (venues por raio; farmácias por especialidade e raio) e, se quiser, o filtro global por raio.

---

## 5. Observações

- **Performance:** A view `mv_venue_farmacia_distancia` pode ter muitos linhas (N venues × M farmácias). Se necessário, limitar a um raio máximo (ex.: 10 ou 20 km) na própria view ou na RPC para evitar explosão de linhas.
- **Especialidade:** O banco usa `screens.specialty` (array de texto). A comparação deve usar o valor exato (ex.: `'Dermatologia'`); se houver variações de grafia, considerar normalização (minúsculas, sem acento) na view ou na RPC.
- **RLS:** As RPCs e a view devem ser acessíveis ao role `authenticated` (ou aos mesmos roles que já acessam `screens`, `venues` e `farmacias`).

---

## 6. Referências no código

- View de distância usada no front: `src/lib/pharmacy-service.ts` → `getNearestPharmaciesForVenue` (tabela `mv_venue_farmacia_distancia`).
- Telas com `venue_id`: `v_screens_enriched`, `screens`; uso em mapa, proposta e relatório já referenciados nas análises anteriores.
- Especialidades: `screens.specialty`; serviço `src/lib/specialties-service.ts`.

---

## 7. Checklist de implementação

| # | Item | Status |
|---|------|--------|
| 1 | Migration: view `mv_venue_farmacia_distancia` + RPCs | ✅ Criada em `supabase/migrations/20260212000000_venue_farmacia_distancia_and_rpcs.sql` |
| 2 | Serviço `venue-pharmacy-radius-service.ts` | ✅ Criado em `src/lib/venue-pharmacy-radius-service.ts` |
| 3 | Mapa interativo: filtro "Raio farmácia" (1–4 km) | Pendente: usar `getVenueIdsWithPharmacyInRadius` e filtrar telas por `venue_id` |
| 4 | Nova proposta: filtro/aba "Com farmácia a até X km" | Pendente: mesmo filtro na lista de telas do passo de seleção |
| 5 | Relatório: seção "Venues por proximidade de farmácia" | Pendente: usar `getVenuesByPharmacyRadiusSummary` em tabela/cards |
| 6 | Relatório: seção "Farmácias por especialidade e raio" | Pendente: usar `getPharmacyCountBySpecialtyAndRadius` em tabela (especialidade × raio) |

**Próximos passos:** Rodar a migration no Supabase (`supabase db push` ou aplicar manualmente), depois implementar os itens 3 a 6 na UI.
