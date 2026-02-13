/**
 * Exemplo de hook customizado para consumir Views do Supabase de forma tipada
 * 
 * Este arquivo serve como referência. Copie e adapte para suas necessidades.
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase, type Views } from '@/integrations/supabase/client';

// ============================================
// Exemplo 1: View simples sem filtros
// ============================================

type EmailStats = Views<'email_stats'>;

export function useEmailStats(options?: Omit<UseQueryOptions<EmailStats[]>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['email-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_stats')
        .select('*');

      if (error) throw error;
      
      // TypeScript sabe que data é do tipo EmailStats[]
      return data;
    },
    ...options
  });
}

// ============================================
// Exemplo 2: View com filtros dinâmicos
// ============================================

type AuditScreensStateUnmapped = Views<'_audit_screens_state_unmapped'>;

interface UseAuditScreensFilters {
  city?: string;
  rawState?: string;
  limit?: number;
}

export function useAuditScreensUnmapped(
  filters?: UseAuditScreensFilters,
  options?: Omit<UseQueryOptions<AuditScreensStateUnmapped[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['audit-screens-unmapped', filters],
    queryFn: async () => {
      let query = supabase
        .from('_audit_screens_state_unmapped')
        .select('*');

      // Aplicar filtros dinamicamente
      if (filters?.city) {
        query = query.eq('city', filters.city);
      }

      if (filters?.rawState) {
        query = query.eq('raw_state', filters.rawState);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query
        .order('city', { ascending: true });

      if (error) throw error;
      
      return data;
    },
    ...options
  });
}

// ============================================
// Exemplo 3: View com paginação
// ============================================

interface UsePaginatedViewOptions {
  page?: number;
  pageSize?: number;
  search?: string;
}

export function usePaginatedEmailStats(paginationOptions?: UsePaginatedViewOptions) {
  const page = paginationOptions?.page ?? 0;
  const pageSize = paginationOptions?.pageSize ?? 10;
  const search = paginationOptions?.search;

  return useQuery({
    queryKey: ['email-stats-paginated', page, pageSize, search],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('email_stats')
        .select('*', { count: 'exact' });

      // Aplicar busca se fornecida
      if (search) {
        query = query.ilike('email_type', `%${search}%`);
      }

      const { data, error, count } = await query
        .range(from, to)
        .order('total', { ascending: false });

      if (error) throw error;

      return {
        items: data as EmailStats[],
        totalCount: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize)
      };
    },
    keepPreviousData: true // Manter dados anteriores durante carregamento
  });
}

// ============================================
// Exemplo 4: Função assíncrona simples (sem React Query)
// ============================================

export async function fetchEmailStatsByType(emailType: string): Promise<EmailStats[]> {
  const { data, error } = await supabase
    .from('email_stats')
    .select('*')
    .eq('email_type', emailType);

  if (error) {
    throw new Error(`Erro ao buscar estatísticas de email: ${error.message}`);
  }

  return data;
}

// ============================================
// Exemplo 5: View com aggregação customizada
// ============================================

interface EmailStatsAggregated {
  totalEmails: number;
  emailsByType: Record<string, number>;
  last7DaysTotal: number;
}

export function useEmailStatsAggregated() {
  return useQuery({
    queryKey: ['email-stats-aggregated'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_stats')
        .select('*');

      if (error) throw error;

      // Processar dados localmente para criar agregações
      const aggregated: EmailStatsAggregated = {
        totalEmails: data.reduce((sum, row) => sum + (row.total ?? 0), 0),
        emailsByType: data.reduce((acc, row) => {
          if (row.email_type) {
            acc[row.email_type] = (row.total ?? 0);
          }
          return acc;
        }, {} as Record<string, number>),
        last7DaysTotal: data.reduce((sum, row) => sum + (row.last_7_days ?? 0), 0)
      };

      return aggregated;
    }
  });
}

// ============================================
// Exemplo 6: View com realtime subscription
// ============================================

export function useRealtimeEmailStats() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Inscrever-se para mudanças em tempo real
    // Nota: Views não suportam realtime diretamente, mas você pode 
    // escutar a tabela base e invalidar a query da view
    const channel = supabase
      .channel('email-logs-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'email_logs' // Tabela base que alimenta a view
        },
        () => {
          // Invalidar a query quando houver mudanças
          queryClient.invalidateQueries(['email-stats']);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useEmailStats();
}

// ============================================
// Como usar nos componentes React
// ============================================

/*
function MyComponent() {
  // Exemplo 1: Simples
  const { data, isLoading, error } = useEmailStats();

  // Exemplo 2: Com filtros
  const { data: auditData } = useAuditScreensUnmapped({ 
    city: 'São Paulo',
    limit: 20 
  });

  // Exemplo 3: Com paginação
  const [page, setPage] = useState(0);
  const { data: paginatedData } = usePaginatedEmailStats({ 
    page, 
    pageSize: 10 
  });

  // Exemplo 4: Com agregação
  const { data: aggregated } = useEmailStatsAggregated();

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div>
      {data?.map((item) => (
        <div key={item.email_type}>
          {item.email_type}: {item.total}
        </div>
      ))}
    </div>
  );
}
*/

// ============================================
// TypeScript: Extrair tipos de Views
// ============================================

/*
// Você pode criar type aliases para suas views:
export type MyViewRow = Views<'minha_view'>;

// E usar em interfaces:
interface MyComponentProps {
  data: MyViewRow[];
  onSelect: (item: MyViewRow) => void;
}

// Ou em tipos de retorno:
async function processViewData(data: MyViewRow[]): Promise<ProcessedData[]> {
  // ...
}
*/
