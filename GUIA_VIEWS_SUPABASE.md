# Guia: Consumir Views do Supabase de Forma Tipada

## 📋 Índice
1. [Atualizar tipos do Supabase](#1-atualizar-tipos-do-supabase)
2. [Consumir Views com TypeScript](#2-consumir-views-com-typescript)
3. [Exemplos práticos](#3-exemplos-práticos)
4. [Troubleshooting](#4-troubleshooting)

---

## 1. Atualizar tipos do Supabase

### Opção A: Gerar tipos automaticamente (Recomendado)

```powershell
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Fazer login no Supabase
npx supabase login

# Gerar tipos TypeScript do seu banco de dados
npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/integrations/supabase/types.ts
```

**Como encontrar seu PROJECT_ID:**
1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em Settings → General
4. Copie o "Reference ID"

### Opção B: Script NPM (Adicionar ao package.json)

Adicione este script no `package.json`:

```json
{
  "scripts": {
    "types:supabase": "npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/integrations/supabase/types.ts"
  }
}
```

Depois execute:
```powershell
npm run types:supabase
```

---

## 2. Consumir Views com TypeScript

### 2.1. Atualizar o cliente do Supabase

Primeiro, atualize o arquivo `src/integrations/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types'; // Importar o tipo Database

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

// Exportar tipos úteis
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
```

### 2.2. Consumir a View

```typescript
import { supabase, type Views } from '@/integrations/supabase/client';

// Exemplo: Supondo que você criou uma view chamada 'vw_heatmap_data'
type HeatmapData = Views<'vw_heatmap_data'>;

// Função para buscar dados da view
async function fetchHeatmapData() {
  const { data, error } = await supabase
    .from('vw_heatmap_data')
    .select('*');

  if (error) {
    console.error('Erro ao buscar dados:', error);
    return [];
  }

  // 'data' agora é tipado como HeatmapData[]
  return data;
}
```

---

## 3. Exemplos práticos

### Exemplo 1: View simples com filtros

```typescript
import { supabase, type Views } from '@/integrations/supabase/client';

// Tipo da view
type EmailStats = Views<'email_stats'>;

async function getEmailStats(emailType?: string) {
  let query = supabase
    .from('email_stats')
    .select('*');

  // Aplicar filtro se fornecido
  if (emailType) {
    query = query.eq('email_type', emailType);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return data as EmailStats[];
}
```

### Exemplo 2: Hook customizado com React Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase, type Views } from '@/integrations/supabase/client';

type HeatmapData = Views<'vw_heatmap_data'>;

interface UseHeatmapDataOptions {
  cidade?: string;
  estado?: string;
}

export function useHeatmapData(options?: UseHeatmapDataOptions) {
  return useQuery({
    queryKey: ['heatmap-data', options],
    queryFn: async () => {
      let query = supabase
        .from('vw_heatmap_data')
        .select('*');

      if (options?.cidade) {
        query = query.eq('cidade', options.cidade);
      }

      if (options?.estado) {
        query = query.eq('estado', options.estado);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return data as HeatmapData[];
    }
  });
}

// Uso no componente
function MyComponent() {
  const { data, isLoading, error } = useHeatmapData({ 
    estado: 'SP' 
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div>
      {data?.map((item) => (
        <div key={item.id}>
          {/* item está tipado! */}
          {item.nome} - {item.cidade}
        </div>
      ))}
    </div>
  );
}
```

### Exemplo 3: View com joins e ordenação

```typescript
import { supabase, type Views } from '@/integrations/supabase/client';

type AuditScreens = Views<'_audit_screens_state_unmapped'>;

async function getUnmappedScreens(limit = 10) {
  const { data, error } = await supabase
    .from('_audit_screens_state_unmapped')
    .select('*')
    .order('city', { ascending: true })
    .limit(limit);

  if (error) throw error;
  
  return data as AuditScreens[];
}
```

### Exemplo 4: View com agregação e contagem

```typescript
import { supabase } from '@/integrations/supabase/client';

async function getEmailStatsWithCount() {
  const { data, error, count } = await supabase
    .from('email_stats')
    .select('*', { count: 'exact' })
    .gte('total', 100); // Filtrar apenas com total >= 100

  if (error) throw error;

  return {
    items: data,
    totalCount: count
  };
}
```

---

## 4. Troubleshooting

### Problema 1: Tipo `Database` é `any`

**Solução:** Atualize o arquivo `client.ts`:

```typescript
// ❌ ERRADO
type Database = any;

// ✅ CORRETO
import type { Database } from './types';
```

### Problema 2: View não aparece nos tipos

**Possíveis causas:**
1. Você não executou `npx supabase gen types` após criar a view
2. A view não está no schema `public`
3. Você não tem permissões para acessar a view

**Solução:**
```sql
-- Verificar se a view existe no schema correto
SELECT table_schema, table_name 
FROM information_schema.views 
WHERE table_name = 'sua_view';

-- Se necessário, conceder permissões
GRANT SELECT ON public.sua_view TO anon, authenticated;
```

### Problema 3: Erro de permissão ao acessar view

**Solução:** Configure Row Level Security (RLS) na view:

```sql
-- Habilitar RLS (se necessário)
ALTER VIEW public.sua_view SET (security_invoker = true);

-- OU criar políticas para a view base
CREATE POLICY "Usuários autenticados podem visualizar"
ON public.tabela_base
FOR SELECT
TO authenticated
USING (true);
```

### Problema 4: Autocompletar não funciona

**Solução:**
1. Reinicie o TypeScript Server no VS Code (Ctrl+Shift+P → "TypeScript: Restart TS Server")
2. Verifique se o arquivo `types.ts` está sendo importado corretamente
3. Certifique-se de que não há erros de compilação TypeScript

---

## 🎯 Checklist para usar Views tipadas

- [ ] View criada no Supabase
- [ ] Permissões configuradas (RLS/Grants)
- [ ] Tipos gerados com `npx supabase gen types`
- [ ] Cliente Supabase atualizado para usar `Database` type
- [ ] Helper types exportados (`Views`, `Tables`, etc.)
- [ ] Hook ou função criada para consumir a view
- [ ] TypeScript validando tipos corretamente

---

## 📚 Recursos adicionais

- [Documentação Supabase TypeScript](https://supabase.com/docs/reference/javascript/typescript-support)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)
- [Generating Types](https://supabase.com/docs/guides/api/generating-types)
