import { supabase } from '@/integrations/supabase/client';

export const debugSupabaseConnection = async () => {
  console.log('🔍 Iniciando debug do Supabase...');
  
  try {
    // 1. Verificar se o usuário está autenticado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Erro ao obter sessão:', sessionError);
      return { success: false, error: 'Erro de autenticação', details: sessionError };
    }
    
    if (!session) {
      console.error('❌ Usuário não autenticado');
      return { success: false, error: 'Usuário não autenticado' };
    }
    
    console.log('✅ Usuário autenticado:', {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role
    });
    
    // 2. Testar conexão básica com uma query simples
    const { data: testConnection, error: connectionError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Erro de conexão:', connectionError);
      return { success: false, error: 'Erro de conexão', details: connectionError };
    }
    
    console.log('✅ Conexão com Supabase OK');
    
    // 3. Testar acesso à tabela screens
    const { data: screensTest, error: screensError } = await supabase
      .from('screens')
      .select('count')
      .limit(1);
    
    if (screensError) {
      console.error('❌ Erro ao acessar tabela screens:', screensError);
      return { 
        success: false, 
        error: 'Sem acesso à tabela screens', 
        details: screensError,
        suggestions: [
          'Verificar se as políticas RLS estão configuradas corretamente',
          'Verificar se o usuário tem permissão de leitura na tabela screens',
          'Verificar se a função is_admin() está funcionando'
        ]
      };
    }
    
    console.log('✅ Acesso à tabela screens OK');
    
    // 4. Contar registros na tabela screens
    const { count, error: countError } = await supabase
      .from('screens')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Erro ao contar screens:', countError);
      return { success: false, error: 'Erro ao contar registros', details: countError };
    }
    
    console.log('📊 Total de screens na tabela:', count);
    
    // 5. Buscar algumas telas com coordenadas
    const { data: sampleScreens, error: sampleError } = await supabase
      .from('screens')
      .select('id, name, city, state, lat, lng, active, class')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .limit(5);
    
    if (sampleError) {
      console.error('❌ Erro ao buscar amostras:', sampleError);
      return { success: false, error: 'Erro ao buscar dados', details: sampleError };
    }
    
    console.log('📋 Amostra de telas:', sampleScreens);
    
    return {
      success: true,
      data: {
        authenticated: true,
        userId: session.user.id,
        email: session.user.email,
        totalScreens: count,
        sampleScreens: sampleScreens,
        screensWithCoordinates: sampleScreens?.length || 0
      }
    };
    
  } catch (error: any) {
    console.error('💥 Erro geral no debug:', error);
    return {
      success: false,
      error: 'Erro geral',
      details: error,
      message: error.message
    };
  }
};

// Função para executar o debug e exibir resultados
export const runSupabaseDebug = async () => {
  const result = await debugSupabaseConnection();
  
  if (result.success) {
    console.log('🎉 Debug concluído com sucesso!', result.data);
    return result.data;
  } else {
    console.error('🚨 Debug falhou:', result);
    return result;
  }
};



