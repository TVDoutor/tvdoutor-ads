# Configurar Deploy Vercel via GitHub

Se o commit vai para o GitHub mas o deploy na Vercel falha, verifique:

## 1. Secrets no GitHub

Em **GitHub → Repositório → Settings → Secrets and variables → Actions**, confirme:

| Secret | Onde obter |
|--------|------------|
| `VERCEL_TOKEN` | [Vercel](https://vercel.com/account/tokens) → Create Token (com acesso ao team) |
| `VERCEL_ORG_ID` | Vercel → Team Settings → General → Team ID |
| `VERCEL_PROJECT_ID` | Vercel → Project Settings → General → Project ID |
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key |

## 2. Permissões do token Vercel

O `VERCEL_TOKEN` deve ser de um usuário com acesso ao time **TV Doutor**. Se o token for de uma conta pessoal sem acesso ao team, o deploy falhará.

**Solução:** Crie o token enquanto estiver logado na conta que pertence ao team TV Doutor, ou adicione sua conta ao team em Vercel → Team Settings → Members.

## 3. Variáveis de ambiente na Vercel

No projeto na Vercel, em **Settings → Environment Variables**, adicione:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_MAPS_API_KEY` (opcional)
- `VITE_MAPBOX_ACCESS_TOKEN` (opcional)

## 4. Root Directory na Vercel

Em **Project Settings → General → Root Directory**: deixe em branco se o `package.json` está na raiz do repositório.

## 5. Reexecutar o workflow

Após corrigir os secrets e permissões:

1. Vá em **Actions** no GitHub
2. Abra o workflow que falhou
3. Clique em **Re-run all jobs**
