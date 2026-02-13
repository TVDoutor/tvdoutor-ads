# Aplicar migração Profissionais da Saúde (Option A – remoto)

O `supabase db push` não consegue aplicar só esta migração porque há outras migrações locais com versões duplicadas e dados já existentes no remoto. Siga estes passos para aplicar **apenas** a migração de profissionais no banco remoto.

## Passo 1: Executar o SQL no Supabase (remoto)

1. Acesse **[Supabase Dashboard](https://app.supabase.com)** e abra o projeto (ref: `vaogzhwzucijiyvyglls`).
2. Vá em **SQL Editor**.
3. Cole e execute o conteúdo do arquivo:
   `supabase/migrations/20260203000000_profissionais_saude_tables_and_view.sql`
4. Confirme que a execução terminou sem erro (tabelas `profissionais_saude`, `profissional_venue`, view `view_detalhes_profissionais` e RLS criados).

## Passo 2: Marcar a migração como aplicada no histórico

No terminal, na pasta do projeto:

```powershell
npx supabase migration repair 20260203000000 --status applied --linked
```

Assim o CLI passa a considerar essa migração como já aplicada e o próximo `supabase db push` não tentará aplicá-la de novo.

---

**Resumo:** Option A (CLI) foi tentada; o histórico foi reparado para as demais migrações. Para esta migração específica é necessário rodar o SQL no Dashboard (Passo 1) e depois o `migration repair` (Passo 2).
