// Serviço para integração com Google Geocoding API
interface GoogleGeocodingResult {
  lat: number;
  lng: number;
  google_place_id: string;
  google_formatted_address: string;
}

interface GoogleGeocodingResponse {
  results: Array<{
    place_id: string;
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }>;
  status: string;
}

/**
 * Converte um endereço em coordenadas e informações do Google Places
 * @param address - Endereço para geocodificar
 * @returns Promise com lat, lng, place_id e formatted_address
 */
export async function geocodeAddress(address: string): Promise<GoogleGeocodingResult> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  console.log('🔑 Chave da API carregada:', apiKey ? 'SIM' : 'NÃO');
  console.log('🔑 Primeiros 10 caracteres da chave:', apiKey ? apiKey.substring(0, 10) + '...' : 'N/A');
  
  if (!apiKey) {
    console.warn('⚠️ Google Maps API Key não configurada. Configure VITE_GOOGLE_MAPS_API_KEY no .env para usar geocoding completo.');
    console.info('📖 Veja o arquivo CONFIGURACAO_API_GOOGLE.md para instruções detalhadas.');
    throw new Error('Google Maps API Key não configurada. Configure VITE_GOOGLE_MAPS_API_KEY no .env');
  }

  // Adicionar "Brasil" ao final do endereço se não estiver presente
  const normalizedAddress = address.toLowerCase().includes('brasil') || 
                           address.toLowerCase().includes('brazil') ? 
                           address : `${address}, Brasil`;

  const encodedAddress = encodeURIComponent(normalizedAddress);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}&region=br&language=pt-BR`;

  try {
    console.log('🌍 Geocodificando endereço:', normalizedAddress);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
    }

    const data: GoogleGeocodingResponse = await response.json();

    if (data.status === 'ZERO_RESULTS') {
      throw new Error('Nenhum resultado encontrado para o endereço fornecido. Verifique se o endereço está correto.');
    }

    if (data.status !== 'OK') {
      throw new Error(`Erro na geocodificação: ${data.status}`);
    }

    if (!data.results || data.results.length === 0) {
      throw new Error('Nenhum resultado encontrado para o endereço fornecido');
    }

    const result = data.results[0];
    
    console.log('✅ Endereço geocodificado com sucesso:', result.formatted_address);
    
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      google_place_id: result.place_id,
      google_formatted_address: result.formatted_address
    };
  } catch (error) {
    console.error('💥 Erro na geocodificação:', error);
    throw new Error(`Falha na geocodificação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Valida se um endereço pode ser geocodificado
 * @param address - Endereço para validar
 * @returns Promise<boolean>
 */
export async function validateAddress(address: string): Promise<boolean> {
  try {
    await geocodeAddress(address);
    return true;
  } catch {
    return false;
  }
}
