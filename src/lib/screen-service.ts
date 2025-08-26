import { createClient } from '@supabase/supabase-js';
import { uploadImage } from './storage';
import { geocodeAddress } from './geocoding';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export interface ScreenFormData {
  code: string;
  name: string;
  address_raw: string;
  city?: string;
  state?: string;
  cep?: string;
  venue_id?: string;
  file: FileList;
}

export interface ScreenData {
  code: string;
  name: string;
  address_raw: string;
  city?: string;
  state?: string;
  cep?: string;
  venue_id?: number;
  asset_url: string;
  lat: number;
  lng: number;
  google_place_id: string;
  google_formatted_address: string;
}

/**
 * Cadastra uma nova tela com upload de imagem e geocodificação
 * @param formData - Dados do formulário
 * @returns Promise com dados da tela cadastrada
 */
export async function createScreen(formData: ScreenFormData): Promise<ScreenData> {
  try {
    const file = formData.file[0];
    
    // 1. Upload da imagem para o Supabase Storage
    console.log('📤 Iniciando upload da imagem...');
    const uploadResult = await uploadImage(file);
    console.log('✅ Imagem enviada:', uploadResult.publicUrl);

    // 2. Geocodificação do endereço
    console.log('🗺️ Iniciando geocodificação...');
    const geocodingResult = await geocodeAddress(formData.address_raw);
    console.log('✅ Endereço geocodificado:', geocodingResult);

    // 3. Preparar dados para inserção
    const screenData = {
      code: formData.code,
      name: formData.name,
      address_raw: formData.address_raw,
      city: formData.city || null,
      state: formData.state || null,
      cep: formData.cep || null,
      venue_id: formData.venue_id ? parseInt(formData.venue_id) : null,
      asset_url: uploadResult.publicUrl,
      lat: geocodingResult.lat,
      lng: geocodingResult.lng,
      google_place_id: geocodingResult.google_place_id,
      google_formatted_address: geocodingResult.google_formatted_address,
      active: true, // Tela ativa por padrão
      created_at: new Date().toISOString()
    };

    // 4. Inserir no banco de dados
    console.log('💾 Salvando dados no banco...');
    const { data: insertedScreen, error: insertError } = await supabase
      .from('screens')
      .insert(screenData)
      .select()
      .single();

    if (insertError) {
      // Se falhar, deletar a imagem enviada
      console.error('❌ Erro ao salvar no banco:', insertError);
      try {
        await supabase.storage.from('screens').remove([uploadResult.filePath]);
      } catch (deleteError) {
        console.error('❌ Erro ao deletar imagem após falha:', deleteError);
      }
      throw new Error(`Falha ao salvar tela: ${insertError.message}`);
    }

    console.log('✅ Tela cadastrada com sucesso:', insertedScreen);
    return insertedScreen as ScreenData;

  } catch (error) {
    console.error('💥 Erro no cadastro da tela:', error);
    throw error;
  }
}

/**
 * Atualiza uma tela existente
 * @param screenId - ID da tela
 * @param updates - Dados para atualizar
 * @returns Promise com dados atualizados
 */
export async function updateScreen(
  screenId: number, 
  updates: Partial<ScreenData>
): Promise<ScreenData> {
  try {
    // Se houver novo endereço, fazer geocodificação
    if (updates.address_raw) {
      console.log('🗺️ Atualizando geocodificação...');
      const geocodingResult = await geocodeAddress(updates.address_raw);
      updates.lat = geocodingResult.lat;
      updates.lng = geocodingResult.lng;
      updates.google_place_id = geocodingResult.google_place_id;
      updates.google_formatted_address = geocodingResult.google_formatted_address;
    }

    const { data: updatedScreen, error } = await supabase
      .from('screens')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', screenId)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao atualizar tela: ${error.message}`);
    }

    return updatedScreen as ScreenData;
  } catch (error) {
    console.error('💥 Erro na atualização da tela:', error);
    throw error;
  }
}

/**
 * Busca telas com filtros
 * @param filters - Filtros opcionais
 * @returns Promise com lista de telas
 */
export async function getScreens(filters?: {
  active?: boolean;
  city?: string;
  state?: string;
  venue_id?: number;
}): Promise<ScreenData[]> {
  try {
    let query = supabase.from('screens').select('*');

    if (filters?.active !== undefined) {
      query = query.eq('active', filters.active);
    }
    if (filters?.city) {
      query = query.eq('city', filters.city);
    }
    if (filters?.state) {
      query = query.eq('state', filters.state);
    }
    if (filters?.venue_id) {
      query = query.eq('venue_id', filters.venue_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Falha ao buscar telas: ${error.message}`);
    }

    return data as ScreenData[];
  } catch (error) {
    console.error('💥 Erro ao buscar telas:', error);
    throw error;
  }
}

/**
 * Busca uma tela específica por ID
 * @param screenId - ID da tela
 * @returns Promise com dados da tela
 */
export async function getScreenById(screenId: number): Promise<ScreenData | null> {
  try {
    const { data, error } = await supabase
      .from('screens')
      .select('*')
      .eq('id', screenId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Tela não encontrada
      }
      throw new Error(`Falha ao buscar tela: ${error.message}`);
    }

    return data as ScreenData;
  } catch (error) {
    console.error('💥 Erro ao buscar tela:', error);
    throw error;
  }
}
