# 📋 Review do Código - Corpo Clínico

## ❌ Código Original (Problemas)

```typescript
// types/saude.ts
export interface ProfissionalDetalhes {
  profissional_id: string;
  profissional_nome: string;
  tipo_profissional: string;
  venue_nome: string;
  especialidades: string[];
}

// services/profissionais.ts
import { supabase } from './supabaseClient';

export const getCorpoClinico = async (venueId?: number) => {
  let query = supabase
    .from('view_detalhes_profissionais')
    .select('*');

  if (venueId) {
    query = query.eq('venue_id', venueId);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data as ProfissionalDetalhes[];
};
```

### 🚨 Problemas Identificados:

1. **❌ Interface manual incompleta** - Faltam campos que existem na view
2. **❌ Campos marcados como não-nullable** - A view retorna campos nullable
3. **❌ Não usa tipos gerados** - Perdendo validação automática do TypeScript
4. **❌ Import incorreto** - `./supabaseClient` não existe no projeto
5. **❌ Cast manual perigoso** - `as ProfissionalDetalhes[]` pode causar erros

---

## ✅ Código Corrigido (Recomendado)

### Opção 1: Usar tipo gerado diretamente (MAIS SIMPLES)

```typescript
// src/services/profissionais.ts
import { supabase, type Views } from '@/integrations/supabase/client';

// Usar o tipo gerado automaticamente
export type ProfissionalDetalhes = Views<'view_detalhes_profissionais'>;

export const getCorpoClinico = async (venueId?: number) => {
  let query = supabase
    .from('view_detalhes_profissionais')
    .select('*');

  if (venueId) {
    query = query.eq('venue_id', venueId);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  
  // TypeScript garante que data tem todos os campos corretos
  return data;
};
```

### Opção 2: Hook com React Query (RECOMENDADO)

```typescript
// src/hooks/useCorpoClinico.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase, type Views } from '@/integrations/supabase/client';

// Tipo gerado automaticamente da view
export type ProfissionalDetalhes = Views<'view_detalhes_profissionais'>;

interface UseCorpoClinicoOptions {
  venueId?: number;
  tipoProfissional?: string;
}

/**
 * Hook para buscar corpo clínico de um venue
 * 
 * @example
 * const { data, isLoading } = useCorpoClinico({ venueId: 123 });
 */
export function useCorpoClinico(
  filters?: UseCorpoClinicoOptions,
  options?: Omit<UseQueryOptions<ProfissionalDetalhes[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['corpo-clinico', filters],
    queryFn: async () => {
      let query = supabase
        .from('view_detalhes_profissionais')
        .select('*');

      // Aplicar filtros
      if (filters?.venueId) {
        query = query.eq('venue_id', filters.venueId);
      }

      if (filters?.tipoProfissional) {
        query = query.eq('tipo_profissional', filters.tipoProfissional);
      }

      const { data, error } = await query
        .order('profissional_nome', { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar corpo clínico: ${error.message}`);
      }

      // TypeScript sabe que data é ProfissionalDetalhes[]
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos
    ...options
  });
}

/**
 * Buscar profissional específico por ID
 */
export async function getProfissionalById(profissionalId: string): Promise<ProfissionalDetalhes | null> {
  const { data, error } = await supabase
    .from('view_detalhes_profissionais')
    .select('*')
    .eq('profissional_id', profissionalId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Não encontrado
    }
    throw error;
  }

  return data;
}

/**
 * Buscar especialidades únicas disponíveis
 */
export async function getEspecialidadesDisponiveis(): Promise<string[]> {
  const { data, error } = await supabase
    .from('view_detalhes_profissionais')
    .select('especialidades');

  if (error) throw error;

  // Flatten e remover duplicatas
  const especialidades = new Set<string>();
  data?.forEach(row => {
    row.especialidades?.forEach(esp => especialidades.add(esp));
  });

  return Array.from(especialidades).sort();
}
```

### Opção 3: Service com funções auxiliares

```typescript
// src/services/corpo-clinico-service.ts
import { supabase, type Views } from '@/integrations/supabase/client';

export type ProfissionalDetalhes = Views<'view_detalhes_profissionais'>;

export interface FiltrosCorpoClinico {
  venueId?: number;
  tipoProfissional?: string;
  especialidade?: string;
  cidade?: string;
}

export class CorpoClinicoService {
  /**
   * Buscar corpo clínico com filtros
   */
  static async buscar(filtros?: FiltrosCorpoClinico): Promise<ProfissionalDetalhes[]> {
    let query = supabase
      .from('view_detalhes_profissionais')
      .select('*');

    if (filtros?.venueId) {
      query = query.eq('venue_id', filtros.venueId);
    }

    if (filtros?.tipoProfissional) {
      query = query.eq('tipo_profissional', filtros.tipoProfissional);
    }

    if (filtros?.cidade) {
      query = query.eq('venue_cidade', filtros.cidade);
    }

    if (filtros?.especialidade) {
      query = query.contains('especialidades', [filtros.especialidade]);
    }

    const { data, error } = await query
      .order('profissional_nome', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Buscar profissional por ID
   */
  static async buscarPorId(profissionalId: string): Promise<ProfissionalDetalhes | null> {
    const { data, error } = await supabase
      .from('view_detalhes_profissionais')
      .select('*')
      .eq('profissional_id', profissionalId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  }

  /**
   * Contar profissionais por venue
   */
  static async contarPorVenue(venueId: number): Promise<number> {
    const { count, error } = await supabase
      .from('view_detalhes_profissionais')
      .select('*', { count: 'exact', head: true })
      .eq('venue_id', venueId);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Agrupar por tipo de profissional
   */
  static async agruparPorTipo(venueId?: number): Promise<Record<string, number>> {
    let query = supabase
      .from('view_detalhes_profissionais')
      .select('tipo_profissional');

    if (venueId) {
      query = query.eq('venue_id', venueId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const agrupado: Record<string, number> = {};
    data?.forEach(row => {
      if (row.tipo_profissional) {
        agrupado[row.tipo_profissional] = (agrupado[row.tipo_profissional] || 0) + 1;
      }
    });

    return agrupado;
  }
}
```

---

## 📊 Campos Disponíveis na View

A view `view_detalhes_profissionais` retorna os seguintes campos:

```typescript
{
  cargo_na_unidade: string | null       // Cargo do profissional
  especialidades: string[] | null       // Lista de especialidades
  profissional_id: string | null        // ID do profissional
  profissional_nome: string | null      // Nome do profissional
  registro_profissional: string | null  // Número do registro (CRM, CRO, etc)
  tipo_profissional: string | null      // Tipo (médico, enfermeiro, etc)
  tipo_registro: string | null          // Tipo do registro (CRM, COREN, etc)
  venue_cidade: string | null           // Cidade do venue
  venue_id: number | null               // ID do venue
  venue_nome: string | null             // Nome do venue
}
```

---

## 🎯 Exemplo de Uso no Componente

```typescript
import React from 'react';
import { useCorpoClinico } from '@/hooks/useCorpoClinico';

export function CorpoClinicoPage() {
  const { data, isLoading, error } = useCorpoClinico({ 
    venueId: 123 
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div>
      <h1>Corpo Clínico</h1>
      {data?.map((profissional) => (
        <div key={profissional.profissional_id}>
          {/* TypeScript sabe todos os campos disponíveis! */}
          <h3>{profissional.profissional_nome}</h3>
          <p>Tipo: {profissional.tipo_profissional}</p>
          <p>Registro: {profissional.registro_profissional} ({profissional.tipo_registro})</p>
          <p>Cargo: {profissional.cargo_na_unidade}</p>
          <p>Venue: {profissional.venue_nome} - {profissional.venue_cidade}</p>
          {profissional.especialidades && (
            <ul>
              {profissional.especialidades.map((esp, idx) => (
                <li key={idx}>{esp}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## ✅ Vantagens do Código Corrigido

1. **✅ Tipo gerado automaticamente** - Sempre sincronizado com o banco
2. **✅ Todos os campos disponíveis** - Acesso a todos os campos da view
3. **✅ Campos nullable tratados** - TypeScript força verificação de null
4. **✅ Autocompletar funcionando** - IDE mostra todos os campos
5. **✅ Import correto** - Usa o cliente configurado do projeto
6. **✅ Sem cast manual** - TypeScript infere os tipos automaticamente
7. **✅ Melhor manutenibilidade** - Menos código duplicado

---

## 🔄 Migração

### Passo 1: Atualizar tipos
```powershell
npm run types:update
```

### Passo 2: Substituir interface manual
```typescript
// Antes (❌)
export interface ProfissionalDetalhes { ... }

// Depois (✅)
export type ProfissionalDetalhes = Views<'view_detalhes_profissionais'>;
```

### Passo 3: Atualizar import
```typescript
// Antes (❌)
import { supabase } from './supabaseClient';

// Depois (✅)
import { supabase, type Views } from '@/integrations/supabase/client';
```

### Passo 4: Remover cast manual
```typescript
// Antes (❌)
return data as ProfissionalDetalhes[];

// Depois (✅)
return data; // TypeScript já sabe o tipo!
```

---

## 📚 Referências

- [QUICK_START_VIEWS.md](./QUICK_START_VIEWS.md)
- [GUIA_VIEWS_SUPABASE.md](./GUIA_VIEWS_SUPABASE.md)
- [src/hooks/useSupabaseView.example.ts](./src/hooks/useSupabaseView.example.ts)
