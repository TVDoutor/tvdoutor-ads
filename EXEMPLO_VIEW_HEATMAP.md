# Exemplo Prático: View de Heatmap Tipada

Este guia mostra um exemplo completo de como criar e consumir uma View do Supabase para dados de heatmap.

---

## 1️⃣ Criar a View no Supabase

No SQL Editor do Supabase, execute:

```sql
-- Criar View para dados de heatmap
CREATE OR REPLACE VIEW public.vw_heatmap_data AS
SELECT 
  t.id,
  t.nome AS tela_nome,
  t.cidade,
  t.estado,
  t.bairro,
  t.latitude,
  t.longitude,
  COUNT(DISTINCT p.id) AS total_propostas,
  COUNT(DISTINCT CASE WHEN p.status = 'aprovada' THEN p.id END) AS propostas_aprovadas,
  AVG(p.valor_total) AS valor_medio,
  -- Normalizar intensidade entre 0 e 1
  CASE 
    WHEN MAX(COUNT(*)) OVER () > 0 
    THEN COUNT(DISTINCT p.id)::float / MAX(COUNT(*)) OVER ()
    ELSE 0 
  END AS intensidade
FROM 
  public.telas t
  LEFT JOIN public.tela_proposta tp ON t.id = tp.tela_id
  LEFT JOIN public.propostas p ON tp.proposta_id = p.id
WHERE 
  t.latitude IS NOT NULL 
  AND t.longitude IS NOT NULL
  AND t.ativo = true
GROUP BY 
  t.id, t.nome, t.cidade, t.estado, t.bairro, t.latitude, t.longitude
ORDER BY 
  total_propostas DESC;

-- Conceder permissões
GRANT SELECT ON public.vw_heatmap_data TO authenticated;
GRANT SELECT ON public.vw_heatmap_data TO anon;

-- Adicionar comentário
COMMENT ON VIEW public.vw_heatmap_data IS 'View para exibir dados de heatmap com contagem de propostas por tela';
```

---

## 2️⃣ Atualizar os tipos TypeScript

Execute no terminal:

```powershell
npm run types:update
```

Isso irá gerar/atualizar o arquivo `src/integrations/supabase/types.ts` com a nova view.

---

## 3️⃣ Criar o Hook customizado

Crie o arquivo `src/hooks/useHeatmapView.ts`:

```typescript
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase, type Views } from '@/integrations/supabase/client';

// Tipo da view (será gerado automaticamente após npm run types:update)
type HeatmapViewData = Views<'vw_heatmap_data'>;

// Filtros disponíveis
export interface HeatmapFilters {
  cidade?: string;
  estado?: string;
  bairro?: string;
  minPropostas?: number;
  minIntensidade?: number;
}

/**
 * Hook para buscar dados de heatmap da view vw_heatmap_data
 */
export function useHeatmapView(
  filters?: HeatmapFilters,
  options?: Omit<UseQueryOptions<HeatmapViewData[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['heatmap-view', filters],
    queryFn: async () => {
      let query = supabase
        .from('vw_heatmap_data')
        .select('*');

      // Aplicar filtros
      if (filters?.cidade) {
        query = query.eq('cidade', filters.cidade);
      }

      if (filters?.estado) {
        query = query.eq('estado', filters.estado);
      }

      if (filters?.bairro) {
        query = query.eq('bairro', filters.bairro);
      }

      if (filters?.minPropostas !== undefined) {
        query = query.gte('total_propostas', filters.minPropostas);
      }

      if (filters?.minIntensidade !== undefined) {
        query = query.gte('intensidade', filters.minIntensidade);
      }

      const { data, error } = await query
        .order('intensidade', { ascending: false });

      if (error) {
        throw new Error(`Erro ao buscar dados de heatmap: ${error.message}`);
      }

      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    ...options
  });
}

/**
 * Converter dados da view para formato esperado pelo Leaflet Heatmap
 */
export function convertToHeatmapPoints(data: HeatmapViewData[]): [number, number, number][] {
  return data
    .filter(item => item.latitude && item.longitude)
    .map(item => [
      item.latitude!,
      item.longitude!,
      item.intensidade ?? 0
    ]);
}

/**
 * Obter estatísticas agregadas dos dados
 */
export function getHeatmapStats(data: HeatmapViewData[]) {
  if (!data || data.length === 0) {
    return {
      totalTelas: 0,
      totalPropostas: 0,
      propostasAprovadas: 0,
      valorMedioGeral: 0,
      cidadesUnicas: 0,
      estadosUnicos: 0
    };
  }

  return {
    totalTelas: data.length,
    totalPropostas: data.reduce((sum, item) => sum + (item.total_propostas ?? 0), 0),
    propostasAprovadas: data.reduce((sum, item) => sum + (item.propostas_aprovadas ?? 0), 0),
    valorMedioGeral: data.reduce((sum, item) => sum + (item.valor_medio ?? 0), 0) / data.length,
    cidadesUnicas: new Set(data.map(item => item.cidade).filter(Boolean)).size,
    estadosUnicos: new Set(data.map(item => item.estado).filter(Boolean)).size
  };
}
```

---

## 4️⃣ Usar no Componente React

```typescript
import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { useHeatmapView, convertToHeatmapPoints, getHeatmapStats } from '@/hooks/useHeatmapView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, AlertCircle } from 'lucide-react';

export function HeatmapViewExample() {
  const [filters, setFilters] = useState({
    estado: undefined as string | undefined,
    minPropostas: 0
  });

  const { data, isLoading, error, refetch } = useHeatmapView(filters);

  // Converter para formato do Leaflet
  const heatmapPoints = data ? convertToHeatmapPoints(data) : [];

  // Calcular estatísticas
  const stats = data ? getHeatmapStats(data) : null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Carregando dados do heatmap...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Erro ao carregar dados</span>
          </div>
          <p className="text-red-600 text-sm mb-4">{error.message}</p>
          <button 
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2 inline" />
            Tentar Novamente
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Telas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTelas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Propostas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPropostas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Aprovadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.propostasAprovadas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Valor Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {stats.valorMedioGeral.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cidades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cidadesUnicas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Estados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.estadosUnicos}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Select
            value={filters.estado}
            onValueChange={(value) => setFilters({ ...filters, estado: value })}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SP">São Paulo</SelectItem>
              <SelectItem value="RJ">Rio de Janeiro</SelectItem>
              <SelectItem value="MG">Minas Gerais</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.minPropostas.toString()}
            onValueChange={(value) => setFilters({ ...filters, minPropostas: parseInt(value) })}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Mín. propostas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Todas</SelectItem>
              <SelectItem value="1">Mínimo 1</SelectItem>
              <SelectItem value="5">Mínimo 5</SelectItem>
              <SelectItem value="10">Mínimo 10</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={() => setFilters({ estado: undefined, minPropostas: 0 })}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Limpar Filtros
          </button>
        </CardContent>
      </Card>

      {/* Mapa */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Calor - {heatmapPoints.length} pontos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] rounded-lg overflow-hidden">
            <MapContainer
              center={[-23.5505, -46.6333]}
              zoom={10}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              {/* Adicione aqui seu HeatmapLayer com heatmapPoints */}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Dados */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes das Telas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {data?.map((item) => (
              <div 
                key={item.id} 
                className="p-3 border rounded hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{item.tela_nome}</h4>
                    <p className="text-sm text-gray-600">
                      {item.bairro}, {item.cidade} - {item.estado}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {item.total_propostas} propostas
                    </div>
                    <div className="text-xs text-green-600">
                      {item.propostas_aprovadas} aprovadas
                    </div>
                    <div className="text-xs text-gray-500">
                      Intensidade: {(item.intensidade * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 5️⃣ Benefícios da Tipagem

Com a tipagem correta, você terá:

✅ **Autocompletar** - O IDE sugere os campos disponíveis
```typescript
data?.map(item => {
  item. // <- IDE mostra: id, tela_nome, cidade, estado, etc.
})
```

✅ **Validação em tempo de compilação** - Erros detectados antes de executar
```typescript
// ❌ Erro: Property 'nome_inexistente' does not exist
const nome = item.nome_inexistente;

// ✅ Correto
const nome = item.tela_nome;
```

✅ **Refatoração segura** - Renomear campos automaticamente
```typescript
// Se você renomear 'intensidade' na view, 
// o TypeScript avisará todos os lugares que precisam ser atualizados
```

✅ **Documentação inline** - Tipos servem como documentação
```typescript
// Hover sobre 'item' mostra todos os campos e tipos
data?.map(item => { ... })
```

---

## 6️⃣ Comandos úteis

```powershell
# Atualizar tipos após modificar a view
npm run types:update

# Verificar se há erros de tipo
npm run lint

# Rodar em desenvolvimento
npm run dev
```

---

## 🎯 Próximos passos

1. ✅ Criar a view no Supabase
2. ✅ Executar `npm run types:update`
3. ✅ Criar o hook `useHeatmapView`
4. ✅ Usar no componente com tipagem completa
5. ✅ Aproveitar o autocompletar e validação do TypeScript!
