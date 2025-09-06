export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export function handleSupabaseError(error: any): DatabaseError {
  console.error('🔍 [DEBUG] Processando erro do Supabase:', error);
  
  // Tabela não encontrada
  if (error.code === '42P01') {
    return new DatabaseError(
      `Tabela não encontrada: ${error.message}`,
      'TABLE_NOT_FOUND',
      error
    );
  }
  
  // Registro não encontrado
  if (error.code === 'PGRST116') {
    return new DatabaseError(
      'Registro não encontrado',
      'NOT_FOUND',
      error
    );
  }
  
  // Erro de autenticação
  if (error.message?.includes('JWT') || error.code === '401') {
    return new DatabaseError(
      'Sessão expirada, faça login novamente',
      'AUTH_ERROR',
      error
    );
  }
  
  // Erro de permissão
  if (error.code === '42501' || error.message?.includes('permission')) {
    return new DatabaseError(
      'Acesso negado - verifique suas permissões',
      'PERMISSION_DENIED',
      error
    );
  }
  
  return new DatabaseError(
    error.message || 'Erro interno do servidor',
    error.code || 'INTERNAL_ERROR',
    error
  );
}

export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  errorMessage?: string
): Promise<T> {
  try {
    console.log('🔍 [DEBUG] Executando operação segura:', errorMessage || 'operação');
    const result = await operation();
    console.log('✅ [DEBUG] Operação concluída com sucesso');
    return result;
  } catch (error) {
    console.error('❌ [DEBUG] Erro na operação:', errorMessage || 'operação', error);
    const dbError = handleSupabaseError(error);
    console.warn('⚠️ [DEBUG] Retornando valor fallback:', fallbackValue);
    return fallbackValue;
  }
}