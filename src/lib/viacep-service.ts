/**
 * Serviço de integração com API ViaCEP
 * Documentação: https://viacep.com.br/
 */

export interface ViaCEPAddress {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export interface ViaCEPError {
  erro: boolean;
}

/**
 * Busca endereço completo por CEP
 * @param cep - CEP com ou sem formatação
 * @returns Dados do endereço ou null se não encontrado
 */
export async function getAddressByCEP(cep: string): Promise<ViaCEPAddress | null> {
  // Remove caracteres não numéricos
  const cleanCEP = cep.replace(/\D/g, '');
  
  // Valida se tem 8 dígitos
  if (cleanCEP.length !== 8) {
    throw new Error('CEP deve conter 8 dígitos');
  }

  try {
    console.log('🔍 Buscando CEP na ViaCEP:', cleanCEP);
    
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    
    if (!response.ok) {
      throw new Error(`Erro na API ViaCEP: ${response.status}`);
    }

    const data: ViaCEPAddress | ViaCEPError = await response.json();
    
    // ViaCEP retorna {erro: true} quando CEP não existe
    if ('erro' in data && data.erro) {
      console.log('❌ CEP não encontrado na base ViaCEP');
      return null;
    }

    console.log('✅ Endereço encontrado:', (data as ViaCEPAddress).logradouro);
    return data as ViaCEPAddress;
    
  } catch (error) {
    console.error('💥 Erro ao buscar CEP:', error);
    throw new Error(`Erro ao consultar CEP: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Busca CEPs por endereço (autocomplete)
 * @param uf - UF (ex: SP, RJ)
 * @param cidade - Nome da cidade (min. 3 caracteres)
 * @param logradouro - Nome da rua/avenida (min. 3 caracteres)
 * @returns Lista de endereços encontrados
 */
export async function searchCEPByAddress(
  uf: string,
  cidade: string,
  logradouro: string
): Promise<ViaCEPAddress[]> {
  // Validações
  if (uf.length !== 2) {
    throw new Error('UF deve ter 2 caracteres');
  }
  if (cidade.length < 3) {
    throw new Error('Cidade deve ter no mínimo 3 caracteres');
  }
  if (logradouro.length < 3) {
    throw new Error('Logradouro deve ter no mínimo 3 caracteres');
  }

  try {
    console.log('🔍 Buscando CEPs por endereço:', { uf, cidade, logradouro });
    
    // URL: https://viacep.com.br/ws/{UF}/{cidade}/{logradouro}/json/
    const url = `https://viacep.com.br/ws/${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(logradouro)}/json/`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro na API ViaCEP: ${response.status}`);
    }

    const data: ViaCEPAddress[] | ViaCEPError = await response.json();
    
    // ViaCEP retorna {erro: true} quando não encontra nada
    if ('erro' in data && data.erro) {
      console.log('❌ Nenhum CEP encontrado para este endereço');
      return [];
    }

    const addresses = data as ViaCEPAddress[];
    console.log(`✅ ${addresses.length} CEPs encontrados`);
    return addresses;
    
  } catch (error) {
    console.error('💥 Erro ao buscar CEPs por endereço:', error);
    return []; // Retorna array vazio em caso de erro
  }
}

/**
 * Formata CEP para o padrão brasileiro (XXXXX-XXX)
 * @param cep - CEP sem formatação
 * @returns CEP formatado
 */
export function formatCEP(cep: string): string {
  const cleanCEP = cep.replace(/\D/g, '');
  
  if (cleanCEP.length !== 8) {
    return cep; // Retorna como está se não tiver 8 dígitos
  }
  
  return `${cleanCEP.substring(0, 5)}-${cleanCEP.substring(5)}`;
}

/**
 * Valida se o CEP tem formato correto
 * @param cep - CEP para validar
 * @returns true se válido
 */
export function isValidCEPFormat(cep: string): boolean {
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8 && /^\d{8}$/.test(cleanCEP);
}

/**
 * Formata endereço completo a partir dos dados da ViaCEP
 * @param address - Dados do endereço
 * @returns Endereço formatado para exibição
 */
export function formatFullAddress(address: ViaCEPAddress): string {
  const parts = [
    address.logradouro,
    address.bairro,
    address.localidade,
    address.uf
  ].filter(Boolean);
  
  return parts.join(', ');
}

/**
 * Formata endereço para uso no Google Geocoding
 * @param address - Dados do endereço
 * @returns Endereço formatado para geocoding
 */
export function formatAddressForGeocoding(address: ViaCEPAddress): string {
  const parts = [
    address.logradouro,
    address.bairro,
    address.localidade,
    address.uf,
    'Brasil'
  ].filter(Boolean);
  
  return parts.join(', ');
}

