import { supabase } from '@/integrations/supabase/client';


export interface UploadResult {
  publicUrl: string;
  filePath: string;
}

/**
 * Faz upload de uma imagem para o Supabase Storage
 * @param file - Arquivo de imagem
 * @param bucket - Nome do bucket (padrão: 'screens')
 * @param customPath - Caminho customizado (opcional)
 * @returns Promise com URL pública e caminho do arquivo
 */
export async function uploadImage(
  file: File, 
  bucket: string = 'screens',
  customPath?: string
): Promise<UploadResult> {
  try {
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      throw new Error('Arquivo deve ser uma imagem');
    }

    // Validar tamanho (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Arquivo muito grande. Máximo 10MB permitido.');
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${randomId}.${extension}`;
    
    const filePath = customPath || `screens/${fileName}`;

    // Upload para o Supabase Storage
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false // Não sobrescrever arquivos existentes
      });

    if (error) {
      console.error('Erro no upload:', error);
      throw new Error(`Falha no upload: ${error.message}`);
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      publicUrl,
      filePath
    };
  } catch (error) {
    console.error('Erro no upload de imagem:', error);
    throw error;
  }
}

/**
 * Remove uma imagem do Supabase Storage
 * @param filePath - Caminho do arquivo
 * @param bucket - Nome do bucket (padrão: 'screens')
 */
export async function deleteImage(
  filePath: string, 
  bucket: string = 'screens'
): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Erro ao deletar imagem:', error);
      throw new Error(`Falha ao deletar: ${error.message}`);
    }
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    throw error;
  }
}

/**
 * Lista imagens em um bucket
 * @param bucket - Nome do bucket
 * @param folder - Pasta específica (opcional)
 * @returns Lista de arquivos
 */
export async function listImages(
  bucket: string = 'screens',
  folder?: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder || '');

    if (error) {
      console.error('Erro ao listar imagens:', error);
      throw new Error(`Falha ao listar: ${error.message}`);
    }

    return data?.map(file => file.name) || [];
  } catch (error) {
    console.error('Erro ao listar imagens:', error);
    throw error;
  }
}
