// Caminho do arquivo: src/lib/search-service.ts
// CÓDIGO FINAL, CORRIGIDO E OTIMIZADO

import { supabase } from '@/integrations/supabase/client';

export interface SearchParams {
  lat: number;
  lng: number;
  startDate: string;
  durationWeeks: string;
  addressName: string;
  formattedAddress?: string;
  placeId?: string;
  radiusKm?: number;
}

export interface ScreenSearchResult {
  id: string;
  code: string;
  name: string;
  display_name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  active: boolean;
  class: string;
  price: number;
  /** Audiência mensal real (pessoas/mês); fallback para estimativa por classe quando não há dado */
  audience: number;
  distance: number;
  address_raw: string;
  venue_name?: string;
}

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine
 * @param lat1 Latitude do primeiro ponto
 * @param lon1 Longitude do primeiro ponto
 * @param lat2 Latitude do segundo ponto
 * @param lon2 Longitude do segundo ponto
 * @returns Distância em quilômetros
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em quilômetros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

/**
 * Busca telas próximas a uma localização específica
 * @param params Parâmetros de busca
 * @returns Lista de telas encontradas
 */
export async function searchScreensNearLocation(params: SearchParams): Promise<ScreenSearchResult[]> {
  try {
    console.log('🔍 Iniciando busca de telas próximas:', params);
    console.log('🔍 Parâmetros recebidos:', {
      lat: params.lat,
      lng: params.lng,
      radiusKm: params.radiusKm,
      addressName: params.addressName
    });

    // Buscar todas as telas ativas com coordenadas válidas
    // Tentar buscar com a coluna class primeiro, se falhar, buscar sem ela
    let { data: screens, error } = await supabase
      .from('screens')
      .select(`
        id,
        code,
        name,
        display_name,
        city,
        state,
        lat,
        lng,
        active,
        address_raw,
        venue_id,
        class,
        audience_monthly,
        audiencia_pacientes,
        audiencia_local
      `)
      .eq('active', true)
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    // Se a coluna class não existir, buscar novamente sem ela
    if (error && error.code === '42703' && error.message.includes('column screens.class does not exist')) {
      console.log('⚠️ Coluna class não existe, buscando sem ela...');
      const { data: screensWithoutClass, error: errorWithoutClass } = await supabase
        .from('screens')
        .select(`
          id,
          code,
          name,
          display_name,
          city,
          state,
          lat,
          lng,
          active,
          address_raw,
          venue_id
        `)
        .eq('active', true)
        .not('lat', 'is', null)
        .not('lng', 'is', null);
      
      screens = screensWithoutClass?.map(screen => ({ ...screen, class: 'ND' })) || null;
      error = errorWithoutClass;
    }

    if (error) {
      console.error('❌ Erro ao buscar telas:', error);
      throw new Error(`Erro ao buscar telas: ${error.message}`);
    }

    if (!screens || screens.length === 0) {
      console.log('⚠️ Nenhuma tela encontrada no banco de dados');
      return [];
    }

    // Verificar se os dados têm os campos necessários
    const firstScreen = screens[0];
    console.log('🔍 Verificação dos dados do banco:', {
      hasCode: !!firstScreen.code,
      hasName: !!firstScreen.name,
      hasDisplayName: !!firstScreen.display_name,
      code: firstScreen.code,
      name: firstScreen.name,
      display_name: firstScreen.display_name
    });

    console.log(`📊 ${screens.length} telas encontradas no banco de dados`);
    console.log('🔍 Primeira tela do banco:', screens[0]);

    // Calcular distâncias e filtrar telas próximas (raio padrão 5km, ou customizado)
    const maxDistance = params.radiusKm || 5; // Raio padrão de 5km
    console.log(`🔍 Filtrando telas em um raio de ${maxDistance}km do ponto:`, {
      lat: params.lat,
      lng: params.lng
    });
    const nearbyScreens = screens
      .map(screen => {
        const distance = calculateDistance(
          params.lat,
          params.lng,
          screen.lat,
          screen.lng
        );
        
        const realAudience = (screen as any).audience_monthly ?? (screen as any).audiencia_pacientes ?? (screen as any).audiencia_local;
        const audience = realAudience != null && Number(realAudience) > 0
          ? Number(realAudience)
          : calculateReach((screen as any).class || 'ND');
        const mappedScreen = {
          id: String(screen.id),
          code: screen.code || 'Código não informado',
          name: screen.name || screen.display_name || 'Nome não informado',
          display_name: screen.display_name || 'Nome não informado',
          city: screen.city || 'Cidade não informada',
          state: screen.state || 'Estado não informado',
          lat: Number(screen.lat),
          lng: Number(screen.lng),
          active: Boolean(screen.active),
          class: (screen as any).class || 'ND',
          price: calculatePrice((screen as any).class || 'ND', params.durationWeeks),
          audience,
          distance: Math.round(distance * 10) / 10,
          address_raw: screen.address_raw || 'Endereço não informado',
          venue_name: undefined
        };
        
        console.log('🔍 Tela mapeada:', { 
          original: { 
            id: screen.id,
            code: screen.code, 
            name: screen.name, 
            display_name: screen.display_name 
          },
          mapped: { 
            id: mappedScreen.id,
            code: mappedScreen.code, 
            name: mappedScreen.name,
            display_name: mappedScreen.display_name
          }
        });
        
        return mappedScreen;
      })
      .filter(screen => {
        const withinRadius = screen.distance <= maxDistance;
        if (screens.indexOf(screens.find(s => s.id === screen.id)!) < 5) {
          console.log(`📍 Tela ${screen.code}: distância ${screen.distance}km, dentro do raio: ${withinRadius}`);
        }
        return withinRadius;
      })
      .sort((a, b) => a.distance - b.distance) // Ordenar por distância
      .slice(0, 20); // Limitar a 20 resultados

    console.log(`✅ ${nearbyScreens.length} telas encontradas próximas (${maxDistance}km de raio)`);
    console.log('🔍 Primeiras 3 telas encontradas:', nearbyScreens.slice(0, 3));
    return nearbyScreens;

  } catch (error) {
    console.error('💥 Erro na busca de telas:', error);
    throw error;
  }
}

/**
 * Busca telas por cidade
 * @param city Nome da cidade
 * @returns Lista de telas na cidade
 */
export async function searchScreensByCity(city: string): Promise<ScreenSearchResult[]> {
  try {
    // Tentar buscar com a coluna class primeiro, se falhar, buscar sem ela
    let { data: screens, error } = await supabase
      .from('screens')
      .select(`
        id,
        code,
        name,
        display_name,
        city,
        state,
        lat,
        lng,
        active,
        address_raw,
        venue_id,
        class,
        audience_monthly,
        audiencia_pacientes,
        audiencia_local
      `)
      .eq('active', true)
      .ilike('city', `%${city}%`)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .limit(20);

    // Se a coluna class não existir, buscar novamente sem ela
    if (error && error.code === '42703' && error.message.includes('column screens.class does not exist')) {
      console.log('⚠️ Coluna class não existe, buscando sem ela...');
      const { data: screensWithoutClass, error: errorWithoutClass } = await supabase
        .from('screens')
        .select(`
          id,
          code,
          name,
          display_name,
          city,
          state,
          lat,
          lng,
          active,
          address_raw,
          venue_id
        `)
        .eq('active', true)
        .ilike('city', `%${city}%`)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .limit(20);
      
      screens = screensWithoutClass?.map(screen => ({ ...screen, class: 'ND' })) || null;
      error = errorWithoutClass;
    }

    if (error) {
      throw new Error(`Erro ao buscar telas por cidade: ${error.message}`);
    }

    if (!screens) return [];

    return screens.map(screen => {
      const realAudience = (screen as any).audience_monthly ?? (screen as any).audiencia_pacientes ?? (screen as any).audiencia_local;
      const audience = realAudience != null && Number(realAudience) > 0
        ? Number(realAudience)
        : calculateReach((screen as any).class || 'ND');
      return {
        id: String(screen.id),
        code: screen.code || 'Código não informado',
        name: screen.name || screen.display_name || 'Nome não informado',
        display_name: screen.display_name || 'Nome não informado',
        city: screen.city || 'Cidade não informada',
        state: screen.state || 'Estado não informado',
        lat: Number(screen.lat),
        lng: Number(screen.lng),
        active: Boolean(screen.active),
        class: (screen as any).class || 'ND',
        price: calculatePrice((screen as any).class || 'ND', '2'),
        audience,
        distance: 0,
        address_raw: screen.address_raw || 'Endereço não informado',
        venue_name: undefined
      };
    });

  } catch (error) {
    console.error('💥 Erro na busca por cidade:', error);
    throw error;
  }
}


// Funções de cálculo de preço e alcance (sem alteração, mas agora recebem 'clase')
function calculatePrice(classType: string, durationWeeks: string): number {
  const basePrices: Record<string, number> = { 'A': 200, 'AB': 180, 'B': 150, 'C': 120, 'D': 100, 'ND': 80 };
  const basePrice = basePrices[classType] || basePrices['ND'];
  const weeks = parseInt(durationWeeks);
  let discount = 0;
  if (weeks >= 12) discount = 0.15;
  else if (weeks >= 8) discount = 0.10;
  else if (weeks >= 4) discount = 0.05;
  return basePrice * (1 - discount);
}

function calculateReach(classType: string): number {
  const reachMap: Record<string, number> = { 'A': 2000, 'AB': 1800, 'B': 1500, 'C': 1200, 'D': 1000, 'ND': 800 };
  return reachMap[classType] || reachMap['ND'];
}
