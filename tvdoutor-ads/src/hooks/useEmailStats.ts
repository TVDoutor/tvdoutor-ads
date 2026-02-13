/**
 * Hook para consumir a view email_stats de forma tipada
 * 
 * Este é um exemplo REAL usando uma view que existe no seu banco de dados
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase, type Views } from '@/integrations/supabase/client';

// Tipo gerado automaticamente a partir da view
export type EmailStatsRow = Views<'email_stats'>;

interface UseEmailStatsOptions {
  emailType?: string;
  minTotal?: number;
}

/**
 * Hook para buscar estatísticas de emails da view email_stats
 * 
 * @example
 * const { data, isLoading } = useEmailStats({ emailType: 'welcome' });
 */
export function useEmailStats(
  filters?: UseEmailStatsOptions,
  options?: Omit<UseQueryOptions<EmailStatsRow[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['email-stats', filters],
    queryFn: async () => {
      let query = supabase
        .from('email_stats')
        .select('*');

      // Aplicar filtros se fornecidos
      if (filters?.emailType) {
        query = query.eq('email_type', filters.emailType);
      }

      if (filters?.minTotal !== undefined) {
        query = query.gte('total', filters.minTotal);
      }

      const { data, error } = await query
        .order('total', { ascending: false });

      if (error) {
        throw new Error(`Erro ao buscar estatísticas de email: ${error.message}`);
      }

      // TypeScript garante que 'data' tem os campos corretos!
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos
    ...options
  });
}

/**
 * Buscar estatísticas totais de emails
 */
export async function getEmailStatsSummary() {
  const { data, error } = await supabase
    .from('email_stats')
    .select('*');

  if (error) throw error;

  // TypeScript sabe que 'data' é do tipo EmailStatsRow[]
  const summary = {
    totalEmails: data.reduce((sum, row) => sum + (row.total ?? 0), 0),
    totalLast7Days: data.reduce((sum, row) => sum + (row.last_7_days ?? 0), 0),
    totalToday: data.reduce((sum, row) => sum + (row.today ?? 0), 0),
    emailTypes: data.length,
    byType: data.reduce((acc, row) => {
      if (row.email_type) {
        acc[row.email_type] = {
          total: row.total ?? 0,
          last7Days: row.last_7_days ?? 0,
          today: row.today ?? 0,
          status: row.status ?? 'unknown'
        };
      }
      return acc;
    }, {} as Record<string, { total: number; last7Days: number; today: number; status: string }>)
  };

  return summary;
}
