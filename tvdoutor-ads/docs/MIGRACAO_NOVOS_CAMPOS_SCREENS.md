# Migração: Novos campos em screens

## Campos adicionados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| **ambiente** | text | Tipo/característica do ambiente (ex: sala de espera, consultório) |
| **audiencia_pacientes** | integer | Audiência mensal de pacientes |
| **audiencia_local** | integer | Audiência mensal local |
| **audiencia_hcp** | integer | Audiência mensal HCP (Healthcare Professionals) |
| **audiencia_medica** | integer | Audiência mensal médica |
| **aceita_convenio** | boolean | Se o local aceita convênio (exibido como "Sim"/"Não") |

## Onde aplicar

Execute a migração no Supabase:

```bash
npx supabase db push
```

Ou aplique manualmente o conteúdo de:
`supabase/migrations/20260212000002_add_screens_venue_details.sql`

## Onde os dados são utilizados

- **Inventário** (`/inventory`): Cadastro, edição, visualização, import/export
- **Pontos de venda** (`/venues`): Listagem e detalhes do venue
- **Relatórios**: Dados disponíveis para consulta
- **Propostas**: Exibição em InventoryCard/InventoryPreview e exportação PDF

## Importação CSV

Colunas opcionais para o inventário completo:

- `Ambiente`
- `Audiencia Pacientes` / `audiencia_pacientes`
- `Audiencia Local` / `audiencia_local`
- `Audiencia HCP` / `audiencia_hcp`
- `Audiencia Medica` / `audiencia_medica`
- `Aceita convenio` / `aceita_convenio` (valores: Sim, Não, S, N, true, 1)

## Regenerar tipos TypeScript (opcional)

Após aplicar a migração:

```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```
