# 🚀 Quick Start: Views Tipadas do Supabase

## Passos rápidos para começar

### 1️⃣ Criar uma View no Supabase

```sql
CREATE OR REPLACE VIEW public.minha_view AS
SELECT 
  id,
  nome,
  cidade
FROM 
  minha_tabela
WHERE 
  ativo = true;

-- Conceder permissões
GRANT SELECT ON public.minha_view TO authenticated, anon;
```

### 2️⃣ Atualizar tipos TypeScript

```powershell
npm run types:update
```

### 3️⃣ Usar no código

```typescript
import { supabase, type Views } from '@/integrations/supabase/client';

// Definir tipo
type MinhaView = Views<'minha_view'>;

// Buscar dados
async function buscarDados() {
  const { data, error } = await supabase
    .from('minha_view')
    .select('*');

  if (error) throw error;
  
  // data agora é tipado como MinhaView[]
  return data;
}
```

### 4️⃣ Criar Hook (opcional)

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase, type Views } from '@/integrations/supabase/client';

type MinhaView = Views<'minha_view'>;

export function useMinhaView() {
  return useQuery({
    queryKey: ['minha-view'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('minha_view')
        .select('*');

      if (error) throw error;
      return data as MinhaView[];
    }
  });
}
```

### 5️⃣ Usar no componente

```typescript
function MeuComponente() {
  const { data, isLoading, error } = useMinhaView();

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div>
      {data?.map(item => (
        <div key={item.id}>
          {item.nome} - {item.cidade}
        </div>
      ))}
    </div>
  );
}
```

---

## 📚 Documentação completa

- **[GUIA_VIEWS_SUPABASE.md](./GUIA_VIEWS_SUPABASE.md)** - Guia completo com todos os detalhes
- **[EXEMPLO_VIEW_HEATMAP.md](./EXEMPLO_VIEW_HEATMAP.md)** - Exemplo completo com heatmap
- **[useSupabaseView.example.ts](./src/hooks/useSupabaseView.example.ts)** - Exemplos de código

---

## ✨ Principais mudanças feitas

✅ Arquivo `client.ts` atualizado para usar tipos do `types.ts`
✅ Helper types adicionados: `Views<T>`, `Tables<T>`, `Enums<T>`
✅ Script `npm run types:update` adicionado ao package.json
✅ Documentação completa criada
✅ Exemplos práticos de uso

---

## 🎯 Próximos passos

1. Criar sua view no Supabase SQL Editor
2. Executar `npm run types:update`
3. Criar um hook customizado (opcional)
4. Usar nos componentes com tipagem completa!

**Pronto!** Agora você pode consumir Views do Supabase de forma totalmente tipada! 🎉
