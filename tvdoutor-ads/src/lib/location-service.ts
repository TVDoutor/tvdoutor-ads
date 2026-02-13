import { supabase } from '@/integrations/supabase/client';
import { geocodeAddress } from './geocoding';

export interface LocationOption {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  type: 'city' | 'address' | 'geocoded';
  displayText: string;
  fullAddress: string;
}

/**
 * Busca cidades únicas do banco de dados
 * @param query Texto de busca
 * @returns Lista de cidades que correspondem à busca
 */
export async function searchCities(query: string): Promise<LocationOption[]> {
  if (query.length < 2) return [];

  try {
    console.log('🔍 Buscando cidades:', query);

    const { data, error } = await supabase
      .from('screens')
      .select('city, state, lat, lng')
      .ilike('city', `%${query}%`)
      .not('city', 'is', null)
      .not('state', 'is', null)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .eq('active', true)
      .limit(20);

    if (error) {
      console.error('❌ Erro ao buscar cidades:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('⚠️ Nenhuma cidade encontrada');
      return [];
    }

    // Agrupar por cidade/estado para evitar duplicatas
    const cityMap = new Map<string, LocationOption>();
    
    data.forEach(item => {
      const key = `${item.city}-${item.state}`;
      if (!cityMap.has(key)) {
        cityMap.set(key, {
          id: key,
          name: item.city,
          city: item.city,
          state: item.state,
          lat: item.lat,
          lng: item.lng,
          type: 'city',
          displayText: `${item.city}, ${item.state}`,
          fullAddress: `${item.city}, ${item.state}, Brasil`
        });
      }
    });

    const cities = Array.from(cityMap.values());
    console.log(`✅ ${cities.length} cidades encontradas`);
    return cities;

  } catch (error) {
    console.error('💥 Erro na busca de cidades:', error);
    return [];
  }
}

/**
 * Busca endereços específicos do banco de dados
 * @param query Texto de busca
 * @returns Lista de endereços que correspondem à busca
 */
export async function searchAddresses(query: string): Promise<LocationOption[]> {
  if (query.length < 3) return [];

  try {
    console.log('🔍 Buscando endereços:', query);

    // Usar múltiplas queries para evitar problemas com o operador 'or'
    const [addressResults, displayResults, nameResults] = await Promise.all([
      // Buscar por address_raw
      supabase
        .from('screens')
        .select('id, name, display_name, city, state, lat, lng, address_raw')
        .ilike('address_raw', `%${query}%`)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .eq('active', true)
        .limit(5),
      
      // Buscar por display_name
      supabase
        .from('screens')
        .select('id, name, display_name, city, state, lat, lng, address_raw')
        .ilike('display_name', `%${query}%`)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .eq('active', true)
        .limit(5),
      
      // Buscar por name
      supabase
        .from('screens')
        .select('id, name, display_name, city, state, lat, lng, address_raw')
        .ilike('name', `%${query}%`)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .eq('active', true)
        .limit(5)
    ]);

    // Verificar erros
    const errors = [addressResults.error, displayResults.error, nameResults.error].filter(Boolean);
    if (errors.length > 0) {
      console.error('❌ Erro ao buscar endereços:', errors);
      return [];
    }

    // Combinar resultados e remover duplicatas
    const allResults = [
      ...(addressResults.data || []),
      ...(displayResults.data || []),
      ...(nameResults.data || [])
    ];

    const uniqueResults = allResults.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );

    if (uniqueResults.length === 0) {
      console.log('⚠️ Nenhum endereço encontrado');
      return [];
    }

    const addresses = uniqueResults.map(item => ({
      id: `address-${item.id}`,
      name: item.display_name || item.name || 'Local não identificado',
      city: item.city || 'Cidade não informada',
      state: item.state || 'Estado não informado',
      lat: item.lat,
      lng: item.lng,
      type: 'address' as const,
      displayText: item.display_name || item.name || 'Local não identificado',
      fullAddress: item.address_raw || `${item.city}, ${item.state}`
    }));

    console.log(`✅ ${addresses.length} endereços encontrados`);
    return addresses;

  } catch (error) {
    console.error('💥 Erro na busca de endereços:', error);
    return [];
  }
}

/**
 * Busca endereços usando Google Geocoding API
 * @param query Texto de busca (endereço completo)
 * @returns Lista de endereços geocodificados
 */
export async function searchGeocodedAddresses(query: string): Promise<LocationOption[]> {
  if (query.length < 5) return []; // Endereços precisam ser mais específicos

  try {
    console.log('🔍 Geocodificando endereço:', query);

    const geocodedResult = await geocodeAddress(query);
    
    // Extrair cidade e estado do endereço formatado
    const addressParts = geocodedResult.google_formatted_address.split(', ');
    const city = addressParts[addressParts.length - 3] || 'Cidade não identificada';
    const state = addressParts[addressParts.length - 2] || 'Estado não identificado';

    const geocodedLocation: LocationOption = {
      id: `geocoded-${geocodedResult.google_place_id}`,
      name: query,
      city: city,
      state: state,
      lat: geocodedResult.lat,
      lng: geocodedResult.lng,
      type: 'geocoded',
      displayText: geocodedResult.google_formatted_address,
      fullAddress: geocodedResult.google_formatted_address
    };

    console.log('✅ Endereço geocodificado com sucesso:', geocodedLocation);
    return [geocodedLocation];

  } catch (error) {
    console.error('💥 Erro na geocodificação:', error);
    
    // Fallback: tentar buscar no banco local se geocoding falhar
    console.log('🔄 Tentando busca local como fallback...');
    try {
      const localResults = await searchAddresses(query);
      if (localResults.length > 0) {
        console.log('✅ Encontrados resultados locais como fallback');
        return localResults;
      }
    } catch (fallbackError) {
      console.error('💥 Erro no fallback local:', fallbackError);
    }
    
    return [];
  }
}

/**
 * Busca localizações combinadas (cidades + endereços + geocodificados)
 * @param query Texto de busca
 * @returns Lista combinada de localizações
 */
export async function searchLocations(query: string): Promise<LocationOption[]> {
  if (query.length < 2) return [];

  try {
    console.log('🔍 Buscando localizações:', query);

    // Determinar se é um endereço específico (contém números ou palavras-chave de endereço)
    const isSpecificAddress = /\d+/.test(query) || 
      /(av|avenida|rua|alameda|praça|travessa|beco|estrada|rodovia|br|km|nº|numero)/i.test(query);

    let searchPromises: Promise<LocationOption[]>[] = [];

    if (isSpecificAddress && query.length >= 5) {
      // Para endereços específicos, tentar geocoding primeiro
      searchPromises = [
        searchGeocodedAddresses(query),
        searchCities(query),
        searchAddresses(query)
      ];
    } else {
      // Para buscas gerais, buscar cidades e endereços do banco
      searchPromises = [
        searchCities(query),
        searchAddresses(query)
      ];
    }

    const results = await Promise.all(searchPromises);
    const [geocodedResults, cities, addresses] = results;

    // Garantir que todos os resultados sejam arrays
    const safeGeocodedResults = Array.isArray(geocodedResults) ? geocodedResults : [];
    const safeCities = Array.isArray(cities) ? cities : [];
    const safeAddresses = Array.isArray(addresses) ? addresses : [];

    // Combinar resultados, priorizando geocodificados, depois cidades, depois endereços
    const combinedResults = [...safeGeocodedResults, ...safeCities, ...safeAddresses];

    // Remover duplicatas baseado no ID
    const uniqueResults = combinedResults.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );

    // Limitar a 10 resultados para não sobrecarregar a interface
    const limitedResults = uniqueResults.slice(0, 10);

    console.log(`✅ ${limitedResults.length} localizações encontradas (${safeGeocodedResults.length} geocodificados + ${safeCities.length} cidades + ${safeAddresses.length} endereços)`);
    return limitedResults;

  } catch (error) {
    console.error('💥 Erro na busca de localizações:', error);
    return [];
  }
}

/**
 * Busca localizações populares (cidades com mais telas)
 * @param limit Limite de resultados
 * @returns Lista de cidades populares
 */
export async function getPopularCities(limit: number = 8): Promise<LocationOption[]> {
  try {
    console.log('🔍 Buscando cidades populares...');

    const { data, error } = await supabase
      .from('screens')
      .select('city, state, lat, lng')
      .not('city', 'is', null)
      .not('state', 'is', null)
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .eq('active', true);

    if (error) {
      console.error('❌ Erro ao buscar cidades populares:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Contar telas por cidade
    const cityCount = new Map<string, { count: number; data: any }>();
    
    data.forEach(item => {
      const key = `${item.city}-${item.state}`;
      if (cityCount.has(key)) {
        cityCount.get(key)!.count++;
      } else {
        cityCount.set(key, { count: 1, data: item });
      }
    });

    // Ordenar por quantidade de telas e pegar as mais populares
    const popularCities = Array.from(cityCount.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([key, { data }]) => ({
        id: key,
        name: data.city,
        city: data.city,
        state: data.state,
        lat: data.lat,
        lng: data.lng,
        type: 'city' as const,
        displayText: `${data.city}, ${data.state}`,
        fullAddress: `${data.city}, ${data.state}, Brasil`
      }));

    console.log(`✅ ${popularCities.length} cidades populares encontradas`);
    return popularCities;

  } catch (error) {
    console.error('💥 Erro ao buscar cidades populares:', error);
    return [];
  }
}
