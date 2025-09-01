import { supabase } from '@/integrations/supabase/client';

export interface DebugResult {
  authenticated: boolean;
  user?: any;
  session?: any;
  connection: boolean;
  tables: string[];
  errors: string[];
}

export async function runSupabaseDebug(): Promise<DebugResult> {
  const result: DebugResult = {
    authenticated: false,
    connection: false,
    tables: [],
    errors: []
  };

  try {
    console.log('🔧 Iniciando diagnóstico do Supabase...');

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      result.errors.push(`Erro de autenticação: ${authError.message}`);
    } else if (user) {
      result.authenticated = true;
      result.user = user;
      console.log('✅ Usuário autenticado:', user.email);
      console.log('👤 Dados do usuário:', {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'N/A',
        created_at: user.created_at
      });
    } else {
      console.log('⚠️ Usuário não autenticado');
    }

    // Verificar sessão
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      result.errors.push(`Erro de sessão: ${sessionError.message}`);
    } else if (session) {
      result.session = session;
      console.log('✅ Sessão ativa');
      console.log('🔑 Token de acesso presente:', !!session.access_token);
    }

    // Testar conexão com a tabela screens - teste detalhado
    console.log('🔍 Testando acesso à tabela screens...');
    try {
      // Teste 1: Contagem simples
      const { data: countData, error: countError } = await supabase
        .from('screens')
        .select('count')
        .limit(1);
      
      if (countError) {
        console.error('❌ Erro na contagem de screens:', countError);
        result.errors.push(`Erro na tabela screens (count): ${countError.message} (${countError.code})`);
      } else {
        console.log('✅ Contagem de screens OK');
      }

      // Teste 2: Seleção de dados
      const { data: selectData, error: selectError } = await supabase
        .from('screens')
        .select('id, name, display_name')
        .limit(1);
      
      if (selectError) {
        console.error('❌ Erro na seleção de screens:', selectError);
        result.errors.push(`Erro na tabela screens (select): ${selectError.message} (${selectError.code})`);
      } else {
        console.log('✅ Seleção de screens OK');
        result.connection = true;
        result.tables.push('screens');
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('💥 Erro geral na tabela screens:', error);
      result.errors.push(`Erro de conexão com screens: ${errorMsg}`);
    }

    // Testar outras tabelas comuns
    const commonTables = ['profiles', 'campaigns', 'venues', 'screen_rates'];
    for (const table of commonTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (error) {
          console.log(`⚠️ Tabela ${table}: ${error.message} (${error.code})`);
        } else {
          result.tables.push(table);
          console.log(`✅ Tabela ${table} acessível`);
        }
      } catch (error) {
        console.log(`❌ Erro geral na tabela ${table}:`, error);
      }
    }

    // Verificar permissões específicas
    console.log('🔐 Verificando permissões específicas...');
    try {
      const { data: rlsData, error: rlsError } = await supabase
        .rpc('get_user_permissions');
      
      if (rlsError) {
        console.log('⚠️ Não foi possível verificar permissões via RPC:', rlsError.message);
      } else {
        console.log('✅ Permissões do usuário:', rlsData);
      }
    } catch (error) {
      console.log('ℹ️ Função de permissões não disponível');
    }

    // Log do resultado final
    console.log('📊 Resultado do diagnóstico:', {
      autenticado: result.authenticated,
      conexao: result.connection,
      tabelas: result.tables,
      erros: result.errors.length
    });

    if (result.errors.length > 0) {
      console.error('❌ Erros encontrados:', result.errors);
    }

    return result;

  } catch (error) {
    console.error('💥 Erro durante diagnóstico:', error);
    result.errors.push(`Erro geral: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}
