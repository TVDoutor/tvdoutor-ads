# Migração de POST para GET - Edge Function project-milestones

Este documento explica como migrar chamadas de POST para GET na Edge Function `project-milestones`.

## 📋 Resumo das Mudanças

### ✅ O que foi implementado:
- **Edge Function atualizada**: Já suporta tanto GET quanto POST
- **Novos serviços**: Criados serviços para chamadas GET
- **Exemplos práticos**: Componentes e hooks de exemplo
- **Documentação completa**: Guias de migração e uso

### 🔧 Arquivos criados:
- `src/lib/milestone-service.ts` - Serviço principal para chamadas GET
- `src/examples/milestone-api-examples.ts` - Exemplos de migração
- `src/components/MilestoneList.tsx` - Componente de exemplo
- `MILESTONE_API_MIGRATION.md` - Este documento

## 🚀 Como usar as novas chamadas GET

### 1. Importar o serviço

```typescript
import { 
  getProjectMilestonesByProject,
  getProjectMilestonesByAgency,
  getProjectMilestonesByProjectAndAgency 
} from '@/lib/milestone-service';
```

### 2. Buscar marcos por projeto

```typescript
// ✅ NOVA FORMA - GET
const result = await getProjectMilestonesByProject('uuid-do-projeto');

if (result.success) {
  console.log('Marcos:', result.data);
} else {
  console.error('Erro:', result.error);
}
```

### 3. Buscar marcos por agência

```typescript
// ✅ NOVA FORMA - GET
const result = await getProjectMilestonesByAgency('uuid-da-agencia');
```

### 4. Buscar marcos com filtros múltiplos

```typescript
// ✅ NOVA FORMA - GET com múltiplos parâmetros
const result = await getProjectMilestonesByProjectAndAgency(
  'uuid-do-projeto', 
  'uuid-da-agencia'
);
```

## 🔄 Comparação: POST vs GET

### ❌ FORMA ANTIGA (POST):
```typescript
// Não recomendado
const { data, error } = await supabase.functions.invoke('project-milestones', {
  body: { projeto_id: projectId }
});
```

### ✅ FORMA NOVA (GET):
```typescript
// Recomendado
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-milestones?projeto_id=${projectId}`,
  {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  }
);

const data = await response.json();
```

## 🎯 Vantagens da abordagem GET

1. **Semântica correta**: GET é para buscar dados, POST é para criar/modificar
2. **Cacheable**: Requisições GET podem ser cacheadas pelo navegador
3. **URLs amigáveis**: Parâmetros visíveis na URL
4. **Melhor para logs**: URLs aparecem nos logs do servidor
5. **Padrão REST**: Segue as convenções RESTful

## 📱 Exemplo de uso em componente React

```typescript
import React, { useState, useEffect } from 'react';
import { getProjectMilestonesByProject } from '@/lib/milestone-service';

export const MeuComponente = ({ projectId }) => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMilestones = async () => {
      setLoading(true);
      
      try {
        const result = await getProjectMilestonesByProject(projectId);
        
        if (result.success) {
          setMilestones(result.data);
        }
      } catch (error) {
        console.error('Erro:', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchMilestones();
    }
  }, [projectId]);

  return (
    <div>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <ul>
          {milestones.map(milestone => (
            <li key={milestone.id}>{milestone.nome_marco}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

## 🔧 Hook personalizado

```typescript
import { useState, useEffect } from 'react';
import { getProjectMilestonesByProject } from '@/lib/milestone-service';

export const useProjectMilestones = (projectId: string) => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchMilestones = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getProjectMilestonesByProject(projectId);
        
        if (result.success) {
          setMilestones(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMilestones();
  }, [projectId]);

  return { milestones, loading, error };
};
```

## 🛠️ Parâmetros suportados

A Edge Function aceita os seguintes parâmetros de query:

- `projeto_id` - ID do projeto (string)
- `agencia_id` - ID da agência (string)
- Ambos podem ser usados juntos para filtrar

### Exemplos de URLs:

```
GET /functions/v1/project-milestones?projeto_id=123
GET /functions/v1/project-milestones?agencia_id=456
GET /functions/v1/project-milestones?projeto_id=123&agencia_id=456
```

## 📊 Resposta da API

```typescript
interface MilestoneResponse {
  success: boolean;
  data: ProjectMilestone[];
  error?: string;
  details?: string;
}

interface ProjectMilestone {
  id: string;
  agencia_id: string;
  projeto_id: string;
  nome_marco: string;
  descricao?: string;
  data_prevista?: string;
  data_conclusao?: string;
  status: string;
  responsavel_id?: string;
  ordem?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}
```

## ⚠️ Notas importantes

1. **Autenticação**: Todas as chamadas requerem token de autenticação
2. **Tratamento de erros**: Sempre verifique `result.success` antes de usar `result.data`
3. **Parâmetros opcionais**: `projeto_id` e `agencia_id` são opcionais, mas pelo menos um deve ser fornecido
4. **Compatibilidade**: A Edge Function ainda aceita POST para compatibilidade com código legado

## 🚀 Próximos passos

1. **Migrar código existente**: Substituir chamadas POST por GET onde apropriado
2. **Testar**: Verificar se todas as funcionalidades continuam funcionando
3. **Documentar**: Atualizar documentação da API
4. **Deprecar POST**: Eventualmente remover suporte a POST (após migração completa)

## 📞 Suporte

Se você encontrar problemas durante a migração:

1. Verifique se o token de autenticação está válido
2. Confirme se os parâmetros estão sendo passados corretamente
3. Verifique os logs da Edge Function no Supabase
4. Teste com os exemplos fornecidos neste documento
