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
  name: string;
  display_name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  active: boolean;
  class: string;
  price: number;
  reach: number;
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

    // Buscar todas as telas ativas com coordenadas válidas
    const { data: screens, error } = await supabase
      .from('screens')
      .select(`
        id,
        name,
        display_name,
        city,
        state,
        lat,
        lng,
        active,
        class,
        address_raw,
        venue_id,
        venues (
          name
        )
      `)
      .eq('active', true)
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (error) {
      console.error('❌ Erro ao buscar telas:', error);
      throw new Error(`Erro ao buscar telas: ${error.message}`);
    }

    if (!screens || screens.length === 0) {
      console.log('⚠️ Nenhuma tela encontrada no banco de dados');
      return [];
    }

    console.log(`📊 ${screens.length} telas encontradas no banco de dados`);

    // Calcular distâncias e filtrar telas próximas (raio padrão 5km, ou customizado)
    const maxDistance = params.radiusKm || 5; // Raio padrão de 5km
    const nearbyScreens = screens
      .map(screen => {
        const distance = calculateDistance(
          params.lat,
          params.lng,
          screen.lat,
          screen.lng
        );
        
        return {
          id: String(screen.id),
          name: screen.name || 'Código não informado',
          display_name: screen.display_name || 'Nome não informado',
          city: screen.city || 'Cidade não informada',
          state: screen.state || 'Estado não informado',
          lat: Number(screen.lat),
          lng: Number(screen.lng),
          active: Boolean(screen.active),
          class: screen.class || 'ND',
          price: calculatePrice(screen.class, params.durationWeeks),
          reach: calculateReach(screen.class),
          distance: Math.round(distance * 10) / 10, // Arredondar para 1 casa decimal
          address_raw: screen.address_raw || 'Endereço não informado',
          venue_name: screen.venues?.name || undefined
        };
      })
      .filter(screen => screen.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance) // Ordenar por distância
      .slice(0, 20); // Limitar a 20 resultados

    console.log(`✅ ${nearbyScreens.length} telas encontradas próximas (${maxDistance}km de raio)`);
    return nearbyScreens;

  } catch (error) {
    console.error('💥 Erro na busca de telas:', error);
    throw error;
  }
}

/**
 * Calcula o preço baseado na classe da tela e duração
 * @param classType Classe da tela (A, AB, B, C, D)
 * @param durationWeeks Duração em semanas
 * @returns Preço calculado
 */
function calculatePrice(classType: string, durationWeeks: string): number {
  const basePrices: Record<string, number> = {
    'A': 200,
    'AB': 180,
    'B': 150,
    'C': 120,
    'D': 100,
    'ND': 80
  };

  const basePrice = basePrices[classType] || basePrices['ND'];
  const weeks = parseInt(durationWeeks);
  
  // Desconto progressivo para campanhas mais longas
  let discount = 0;
  if (weeks >= 12) discount = 0.15; // 15% de desconto para 3+ meses
  else if (weeks >= 8) discount = 0.10; // 10% de desconto para 2+ meses
  else if (weeks >= 4) discount = 0.05; // 5% de desconto para 1+ mês

  return basePrice * (1 - discount);
}

/**
 * Calcula o alcance baseado na classe da tela
 * @param classType Classe da tela
 * @returns Alcance estimado em pessoas por semana
 */
function calculateReach(classType: string): number {
  const reachMap: Record<string, number> = {
    'A': 2000,
    'AB': 1800,
    'B': 1500,
    'C': 1200,
    'D': 1000,
    'ND': 800
  };

  return reachMap[classType] || reachMap['ND'];
}

/**
 * Busca telas por cidade
 * @param city Nome da cidade
 * @returns Lista de telas na cidade
 */
export async function searchScreensByCity(city: string): Promise<ScreenSearchResult[]> {
  try {
    const { data: screens, error } = await supabase
      .from('screens')
      .select(`
        id,
        name,
        display_name,
        city,
        state,
        lat,
        lng,
        active,
        class,
        address_raw,
        venue_id,
        venues (
          name
        )
      `)
      .eq('active', true)
      .ilike('city', `%${city}%`)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .limit(20);

    if (error) {
      throw new Error(`Erro ao buscar telas por cidade: ${error.message}`);
    }

    if (!screens) return [];

    return screens.map(screen => ({
      id: String(screen.id),
      name: screen.name || 'Código não informado',
      display_name: screen.display_name || 'Nome não informado',
      city: screen.city || 'Cidade não informada',
      state: screen.state || 'Estado não informado',
      lat: Number(screen.lat),
      lng: Number(screen.lng),
      active: Boolean(screen.active),
      class: screen.class || 'ND',
      price: calculatePrice(screen.class, '2'), // Preço padrão para 2 semanas
      reach: calculateReach(screen.class),
      distance: 0, // Não aplicável para busca por cidade
      address_raw: screen.address_raw || 'Endereço não informado',
      venue_name: screen.venues?.name || undefined
    }));

  } catch (error) {
    console.error('💥 Erro na busca por cidade:', error);
    throw error;
  }
}
