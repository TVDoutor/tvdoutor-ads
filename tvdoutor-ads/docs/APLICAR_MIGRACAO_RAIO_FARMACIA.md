# Aplicar migração Raio Farmácia + Especialidade

A migration cria a view `mv_venue_farmacia_distancia` e as RPCs usadas pelo mapa, nova proposta e relatório.

## Opção A: Via Supabase Dashboard (recomendado se o projeto não estiver linkado)

1. Acesse o **[Supabase Dashboard](https://app.supabase.com)** e abra o projeto.
2. Vá em **SQL Editor**.
3. Abra o arquivo `supabase/migrations/20260212000000_venue_farmacia_distancia_and_rpcs.sql`, copie todo o conteúdo e cole no editor.
4. Execute (Run). Confira que não há erros.
5. (Opcional) Para o CLI não tentar reaplicar depois:  
   `npx supabase migration repair 20260212000000 --status applied --linked`

## Opção B: Via CLI (quando o projeto estiver linkado)

```powershell
cd tvdoutor-ads
npx supabase db push --linked
```

## Verificar

No SQL Editor, rode (use `::double precision` para o raio, pois a função espera esse tipo):

```sql
SELECT * FROM get_venue_ids_with_pharmacy_in_radius(2::double precision) LIMIT 5;
SELECT get_pharmacy_count_by_specialty_and_radius('Dermatologia', 2::double precision);
SELECT * FROM get_venues_by_pharmacy_radius_summary(ARRAY[1.0, 2.0, 3.0, 4.0]::double precision[]);
```

Se retornarem dados (ou zero linhas) sem erro, a migration está ativa.

## (Opcional) Farmácias no mapa no raio

Para que o mapa mostre **somente as farmácias** que estão no raio selecionado (além das telas), execute também no SQL Editor o conteúdo de:

`supabase/migrations/20260212000001_get_farmacia_ids_in_radius.sql`

Isso cria a função `get_farmacia_ids_in_radius(radius_km)`. Sem ela, com "Raio farmácia" ativo as telas são filtradas, mas as farmácias continuam todas; com a função, as farmácias no mapa também são filtradas pelo raio.
