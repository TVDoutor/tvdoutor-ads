import { supabase } from '@/integrations/supabase/client';
import type { Specialty, SpecialtyUnified } from '@/hooks/useSpecialties';

/**
 * Serviço para gerenciamento de especialidades
 * Centraliza todas as operações relacionadas a especialidades
 */
export class SpecialtiesService {
  /**
   * Busca todas as especialidades da view unificada
   */
  static async getAllSpecialties(): Promise<Specialty[]> {
    const { data, error } = await supabase
      .from('v_specialties_for_dashboard')
      .select('*')
      .order('specialty_name');

    if (error) {
      console.error('Erro ao buscar especialidades:', error);
      throw new Error(`Erro ao carregar especialidades: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Busca especialidades detalhadas com informações de origem
   */
  static async getSpecialtiesDetailed(): Promise<SpecialtyUnified[]> {
    const { data, error } = await supabase
      .from('v_specialties_unified')
      .select('*')
      .order('specialty_name');

    if (error) {
      console.error('Erro ao buscar especialidades detalhadas:', error);
      throw new Error(`Erro ao carregar especialidades detalhadas: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Busca especialidades com fallback para tabela screens
   */
  static async getSpecialtiesWithFallback(): Promise<string[]> {
    try {
      // Tentar primeiro a view unificada
      const specialties = await this.getAllSpecialties();
      return specialties.map(s => s.specialty_name);
    } catch (error) {
      console.warn('View unificada falhou, usando fallback:', error);
      
      // Fallback para busca direta
      const { data, error: fallbackError } = await supabase
        .from('screens')
        .select('specialty')
        .not('specialty', 'is', null)
        .limit(1000);

      if (fallbackError) {
        console.error('Erro no fallback:', fallbackError);
        throw new Error(`Erro ao carregar especialidades: ${fallbackError.message}`);
      }

      const allSpecialties = (data || [])
        .flatMap((row: any) => row.specialty || [])
        .filter(Boolean)
        .map((s: string) => s.trim())
        .filter(Boolean);

      return Array.from(new Set(allSpecialties))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }
  }

  /**
   * Busca cidades disponíveis para uma especialidade específica
   */
  static async getCitiesBySpecialty(specialty: string): Promise<string[]> {
    console.log('🔍 Buscando cidades para especialidade:', specialty);

    try {
      // Tentar primeiro com a view enriquecida
      let { data, error } = await supabase
        .from('v_screens_enriched')
        .select('city')
        .contains('specialty', [specialty])
        .not('city', 'is', null)
        .limit(2000);

      if (error) {
        console.log('🔄 Tentando fallback para tabela screens...');
        const fallback = await supabase
          .from('screens')
          .select('city')
          .contains('specialty', [specialty])
          .eq('active', true as any)
          .not('city', 'is', null)
          .limit(2000);
        
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.warn('⚠️ Erro na query de cidades, usando fallback');
        // Fallback: buscar todas as cidades
        const { data: allCities } = await supabase
          .from('screens')
          .select('city')
          .not('city', 'is', null)
          .eq('active', true as any)
          .limit(2000);

        const uniqueCities = Array.from(new Set(
          (allCities || [])
            .map((r: any) => (r.city || '').trim())
            .filter(Boolean)
        )).sort((a, b) => a.localeCompare(b, 'pt-BR'));

        return uniqueCities;
      }

      const uniqueCities = Array.from(new Set(
        (data || [])
          .map((r: any) => (r.city || '').trim())
          .filter(Boolean)
      )).sort((a, b) => a.localeCompare(b, 'pt-BR'));

      console.log('🏙️ Cidades encontradas:', uniqueCities.length);
      return uniqueCities;

    } catch (err) {
      console.error('❌ Erro ao buscar cidades por especialidade:', err);
      throw new Error('Erro ao carregar cidades específicas');
    }
  }

  /**
   * Força refresh das views de especialidades
   */
  static async refreshViews(): Promise<string> {
    const { data, error } = await supabase
      .rpc('refresh_specialties_views');

    if (error) {
      console.error('Erro ao refreshar views:', error);
      throw new Error(`Erro ao refreshar views: ${error.message}`);
    }

    return data || 'Views atualizadas com sucesso';
  }

  /**
   * Valida se uma especialidade existe
   */
  static async validateSpecialty(specialty: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('v_specialties_for_dashboard')
      .select('specialty_name')
      .eq('specialty_name', specialty)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Erro ao validar especialidade:', error);
      return false;
    }

    return !!data;
  }

  /**
   * Busca estatísticas de uso de especialidades
   */
  static async getSpecialtiesStats(): Promise<{
    total: number;
    mostUsed: Specialty[];
    recentlyUpdated: Specialty[];
  }> {
    const specialties = await this.getAllSpecialties();
    
    const sortedByUsage = [...specialties].sort((a, b) => b.total_occurrences - a.total_occurrences);
    const sortedByDate = [...specialties].sort((a, b) => 
      new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
    );

    return {
      total: specialties.length,
      mostUsed: sortedByUsage.slice(0, 10),
      recentlyUpdated: sortedByDate.slice(0, 10),
    };
  }

  /**
   * Busca especialidades similares (para autocomplete/sugestões)
   */
  static async searchSpecialties(query: string): Promise<Specialty[]> {
    if (!query.trim()) return [];

    const { data, error } = await supabase
      .from('v_specialties_for_dashboard')
      .select('*')
      .ilike('specialty_name', `%${query}%`)
      .order('total_occurrences', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Erro ao buscar especialidades:', error);
      return [];
    }

    return data || [];
  }
}
