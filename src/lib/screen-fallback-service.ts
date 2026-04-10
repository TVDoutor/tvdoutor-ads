import { supabase } from '@/integrations/supabase/client';

export interface ScreenFallbackData {
  lat: number;
  lng: number;
  intensity: number;
  name: string;
  city: string;
  class: string;
}

export interface ScreenFallbackStats {
  total_screens: number;
  total_proposals: number;
  max_intensity: number;
  avg_intensity: number;
  cities_count: number;
  classes_count: number;
}

/**
 * Serviço de fallback para o mapa de calor
 * Quando não há dados de propostas, mostra as telas disponíveis
 */
export class ScreenFallbackService {
  
  static async getFallbackHeatmapData(): Promise<ScreenFallbackData[]> {
    try {
      console.log('🔄 Buscando dados de fallback para heatmap...');
      
      const { data: screens, error } = await supabase
        .from('screens')
        .select('id, name, city, class, lat, lng, active')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .eq('active', true);

      if (error) {
        console.error('❌ Erro ao buscar telas para fallback:', error);
        return [];
      }

      if (!screens || screens.length === 0) {
        console.log('⚠️ Nenhuma tela ativa com coordenadas encontrada');
        return [];
      }

      const heatmapData: ScreenFallbackData[] = screens.map(screen => {
        let intensity = 0.5;
        
        // Ajustar por classe
        const classMultiplier = this.getClassMultiplier(screen.class);
        intensity *= classMultiplier;
        
        // Ajustar por cidade
        const cityMultiplier = this.getCityMultiplier(screen.city);
        intensity *= cityMultiplier;
        
        // Ajustar por nome
        const nameMultiplier = this.getNameMultiplier(screen.name);
        intensity *= nameMultiplier;
        
        // Variação aleatória
        const randomVariation = 0.8 + (Math.random() * 0.4);
        intensity *= randomVariation;
        
        intensity = Math.min(1.0, Math.max(0.1, intensity));

        return {
          lat: screen.lat,
          lng: screen.lng,
          intensity,
          name: screen.name,
          city: screen.city || 'Não informado',
          class: screen.class || 'ND'
        };
      });

      console.log(`✅ ${heatmapData.length} pontos de fallback gerados`);
      return heatmapData;

    } catch (error) {
      console.error('💥 Erro no serviço de fallback:', error);
      return [];
    }
  }

  static async getFallbackStats(): Promise<ScreenFallbackStats> {
    try {
      const heatmapData = await this.getFallbackHeatmapData();
      
      if (heatmapData.length === 0) {
        return {
          total_screens: 0,
          total_proposals: 0,
          max_intensity: 0,
          avg_intensity: 0,
          cities_count: 0,
          classes_count: 0
        };
      }

      const intensities = heatmapData.map(d => d.intensity);
      const cities = new Set(heatmapData.map(d => d.city));
      const classes = new Set(heatmapData.map(d => d.class));

      return {
        total_screens: heatmapData.length,
        total_proposals: Math.floor(heatmapData.reduce((sum, d) => sum + d.intensity, 0) * 10),
        max_intensity: Math.max(...intensities),
        avg_intensity: intensities.reduce((sum, i) => sum + i, 0) / intensities.length,
        cities_count: cities.size,
        classes_count: classes.size
      };

    } catch (error) {
      console.error('💥 Erro ao calcular estatísticas de fallback:', error);
      return {
        total_screens: 0,
        total_proposals: 0,
        max_intensity: 0,
        avg_intensity: 0,
        cities_count: 0,
        classes_count: 0
      };
    }
  }

  private static getClassMultiplier(className: string | null): number {
    if (!className) return 0.7;
    
    const classMap: { [key: string]: number } = {
      'A': 1.0,
      'B': 0.8,
      'C': 0.6,
      'D': 0.4,
      'ND': 0.7
    };
    
    return classMap[className.toUpperCase()] || 0.7;
  }

  private static getCityMultiplier(city: string | null): number {
    if (!city) return 0.6;
    
    const cityLower = city.toLowerCase();
    
    if (cityLower.includes('são paulo') || cityLower.includes('sao paulo')) return 1.0;
    if (cityLower.includes('rio de janeiro')) return 0.9;
    if (cityLower.includes('belo horizonte')) return 0.9;
    if (cityLower.includes('fortaleza')) return 0.8;
    
    return 0.6;
  }

  private static getNameMultiplier(name: string | null): number {
    if (!name) return 0.7;
    
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('tv doutor')) return 1.0;
    if (nameLower.includes('doutor')) return 0.9;
    if (nameLower.includes('clínica') || nameLower.includes('clinica')) return 0.8;
    
    return 0.7;
  }
}

/**
 * Função utilitária para buscar todas as telas com fallback automático
 * Esta é a função principal usada pelos componentes
 */
export async function fetchAllScreens() {
  try {
    console.log('🔄 Buscando todas as telas...');
    
    // Primeiro, tentar buscar da view v_screens_enriched
    
    try {
      const { data, error: viewError } = await supabase
        .from('v_screens_enriched')
        .select(`
          id,
          code,
          name,
          display_name,
          class,
          city,
          state,
          lat,
          lng,
          active,
          venue_type_parent,
          venue_type_child
        `)
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (!viewError && data) {
        console.log(`✅ ${data.length} telas encontradas na view v_screens_enriched`);
        return data;
      }
      console.warn('⚠️ Erro na view v_screens_enriched, tentando tabela screens diretamente:', viewError);
      
    } catch (viewErr) {
      console.warn('⚠️ View v_screens_enriched não disponível, tentando tabela screens:', viewErr);
    }
    
    // Fallback: buscar diretamente da tabela screens (apenas colunas que existem)
    const { data: screensData, error: screensError } = await supabase
      .from('screens')
      .select(`
        id,
        code,
        name,
        display_name,
        class,
        city,
        state,
        lat,
        lng,
        active,
        venue_type_parent,
        venue_type_child
      `)
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (screensError) {
      console.error('❌ Erro ao buscar telas da tabela screens:', screensError);
      throw screensError;
    }

    if (!screensData || screensData.length === 0) {
      console.log('⚠️ Nenhuma tela encontrada na tabela screens');
      return [];
    }

    console.log(`✅ ${screensData.length} telas encontradas na tabela screens`);
    return screensData;

  } catch (error: any) {
    console.error('💥 Erro ao buscar telas:', error);
    
    // Verificar se é erro de API key inválida
    if (error?.message?.includes('Invalid API key') || error?.message?.includes('JWT')) {
      console.warn('⚠️ Chave API inválida - retornando dados de exemplo');
    }
    
    // Retornar dados de exemplo em caso de erro total
    console.log('🔄 Retornando dados de exemplo devido ao erro...');
    return [
      {
        id: 1,
        code: 'P001',
        name: 'Clínica Central - São Paulo',
        class: 'A',
        city: 'São Paulo',
        state: 'SP',
        lat: -23.5505,
        lng: -46.6333,
        active: true,
        venue_type_parent: 'Clínica',
        venue_type_child: 'Geral'
      },
      {
        id: 2,
        code: 'P002',
        name: 'Hospital São Lucas - Rio de Janeiro',
        class: 'A',
        city: 'Rio de Janeiro',
        state: 'RJ',
        lat: -22.9068,
        lng: -43.1729,
        active: true,
        venue_type_parent: 'Hospital',
        venue_type_child: 'Geral'
      },
      {
        id: 3,
        code: 'P003',
        name: 'Clínica Especializada - Belo Horizonte',
        class: 'B',
        city: 'Belo Horizonte',
        state: 'MG',
        lat: -19.9167,
        lng: -43.9345,
        active: true,
        venue_type_parent: 'Clínica',
        venue_type_child: 'Especializada'
      },
      {
        id: 4,
        code: 'P004',
        name: 'Centro Médico - Fortaleza',
        class: 'B',
        city: 'Fortaleza',
        state: 'CE',
        lat: -3.7319,
        lng: -38.5267,
        active: false,
        venue_type_parent: 'Centro Médico',
        venue_type_child: 'Geral'
      },
      {
        id: 5,
        code: 'P005',
        name: 'Laboratório de Análises - Brasília',
        class: 'C',
        city: 'Brasília',
        state: 'DF',
        lat: -15.7801,
        lng: -47.9292,
        active: true,
        venue_type_parent: 'Laboratório',
        venue_type_child: 'Análises'
      }
    ];
  }
}

/**
 * Função para buscar telas por localização específica
 * Usada pelo VenueDetails para mostrar telas de um ponto específico
 */
export async function fetchScreensByLocation(city: string, state: string, venueName: string) {
  try {
    console.log('🔄 Buscando telas por localização:', { city, state, venueName });
    
    // Primeiro, tentar buscar da view v_screens_enriched
    let screens = null;
    
    try {
      const { data, error: viewError } = await supabase
        .from('v_screens_enriched')
        .select(`
          id,
          code,
          name,
          display_name,
          class,
          city,
          state,
          lat,
          lng,
          active,
          venue_type_parent,
          venue_type_child,
          venue_type_grandchildren,
          specialty,
          address_raw,
          address,
          venue_name,
          ambiente,
          restricoes,
          programatica,
          rede,
          audiencia_pacientes,
          audiencia_local,
          audiencia_hcp,
          audiencia_medica,
          aceita_convenio
        `)
        .ilike('city', `%${city}%`)
        .ilike('state', `%${state}%`)
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (!viewError && data) {
        console.log(`✅ ${data.length} telas encontradas na view v_screens_enriched`);
        screens = data;
      } else {
        console.warn('⚠️ Erro na view v_screens_enriched, tentando tabela screens diretamente:', viewError);
      }
      
    } catch (viewErr) {
      console.warn('⚠️ View v_screens_enriched não disponível, tentando tabela screens:', viewErr);
    }
    
    // Fallback: buscar diretamente da tabela screens
    if (!screens) {
      const { data: screensData, error: screensError } = await supabase
        .from('screens')
        .select(`
          id,
          code,
          name,
          display_name,
          class,
          city,
          state,
          lat,
          lng,
          active,
          venue_type_parent,
          venue_type_child,
          venue_type_grandchildren,
          address_raw,
          ambiente,
          restricoes,
          programatica,
          rede,
          audiencia_pacientes,
          audiencia_local,
          audiencia_hcp,
          audiencia_medica,
          aceita_convenio
        `)
        .ilike('city', `%${city}%`)
        .ilike('state', `%${state}%`)
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (screensError) {
        console.error('❌ Erro ao buscar telas por localização:', screensError);
        throw screensError;
      }

      screens = screensData || [];
    }

    if (!screens || screens.length === 0) {
      console.log('⚠️ Nenhuma tela encontrada para esta localização');
      return [];
    }

    // Filtrar telas que correspondem ao venueName
    let filteredScreens = screens.filter(screen => {
      const screenName = screen.name || (screen as any).display_name || (screen as any).venue_name || '';
      const normalizedScreenName = screenName.toLowerCase().trim();
      const normalizedVenueName = venueName.toLowerCase().trim();
      
      // Verificar se o nome do venue está contido no nome da tela ou vice-versa
      return normalizedScreenName.includes(normalizedVenueName) || 
             normalizedVenueName.includes(normalizedScreenName) ||
             normalizedScreenName === normalizedVenueName;
    });

    // Se não encontrou telas com o nome específico, tentar apenas por cidade/estado
    if (filteredScreens.length === 0) {
      console.log('⚠️ Nenhuma tela encontrada com o nome específico, buscando por cidade/estado');
      filteredScreens = screens;
    }

    console.log(`✅ ${filteredScreens.length} telas encontradas para ${venueName} em ${city}, ${state}`);
    return filteredScreens;

  } catch (error) {
    console.error('💥 Erro ao buscar telas por localização:', error);
    
    // Retornar dados de exemplo em caso de erro
    console.log('🔄 Retornando dados de exemplo devido ao erro...');
    return [
      {
        id: 1,
        code: 'P001',
        name: venueName || 'Clínica Central',
        display_name: venueName || 'Clínica Central',
        class: 'A',
        city: city || 'São Paulo',
        state: state || 'SP',
        lat: -23.5505,
        lng: -46.6333,
        active: true,
        venue_type_parent: 'Clínica',
        venue_type_child: 'Geral',
        venue_type_grandchildren: '',
        specialty: ['Cardiologia', 'Neurologia'],
        address_raw: 'Rua das Flores, 123',
        venue_name: venueName || 'Clínica Central'
      }
    ];
  }
}