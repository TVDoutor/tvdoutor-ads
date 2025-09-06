import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface PermissionDebugInfo {
  userId: string | null;
  isAuthenticated: boolean;
  userRoles: any[];
  profileData: any;
  hasAdminRole: boolean;
  hasSuperAdminRole: boolean;
  canAccessAgencias: boolean;
  canAccessDeals: boolean;
  canAccessProjetos: boolean;
}

const DebugPermissions: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<PermissionDebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testPermissions();
  }, []);

  const testPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Iniciando teste de permissões...');
      
      // 1. Verificar usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        throw new Error(`Erro ao obter usuário: ${userError.message}`);
      }
      
      console.log('👤 Usuário atual:', user?.id);
      
      // 2. Verificar roles do usuário
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user?.id);
      
      console.log('🎭 Roles do usuário:', userRoles);
      if (rolesError) console.error('❌ Erro ao buscar roles:', rolesError);
      
      // 3. Verificar perfil do usuário
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      console.log('👤 Perfil do usuário:', profileData);
      if (profileError) console.error('❌ Erro ao buscar perfil:', profileError);
      
      // 4. Testar funções de permissão
      const { data: hasAdminResult, error: adminError } = await supabase
        .rpc('is_admin');
      
      console.log('🔐 is_admin():', hasAdminResult);
      if (adminError) console.error('❌ Erro ao testar is_admin:', adminError);
      
      const { data: hasSuperAdminResult, error: superAdminError } = await supabase
        .rpc('is_super_admin');
      
      console.log('🔐 is_super_admin():', hasSuperAdminResult);
      if (superAdminError) console.error('❌ Erro ao testar is_super_admin:', superAdminError);
      
      // 5. Testar acesso às tabelas
      const { data: agenciasTest, error: agenciasError } = await supabase
        .from('agencias')
        .select('id')
        .limit(1);
      
      console.log('🏢 Teste agencias:', agenciasTest?.length || 0, 'registros');
      if (agenciasError) console.error('❌ Erro ao acessar agencias:', agenciasError);
      
      const { data: dealsTest, error: dealsError } = await supabase
        .from('agencia_deals')
        .select('id')
        .limit(1);
      
      console.log('💼 Teste agencia_deals:', dealsTest?.length || 0, 'registros');
      if (dealsError) console.error('❌ Erro ao acessar agencia_deals:', dealsError);
      
      const { data: projetosTest, error: projetosError } = await supabase
        .from('agencia_projetos')
        .select('id')
        .limit(1);
      
      console.log('📋 Teste agencia_projetos:', projetosTest?.length || 0, 'registros');
      if (projetosError) console.error('❌ Erro ao acessar agencia_projetos:', projetosError);
      
      // 6. Compilar informações de debug
      const debugData: PermissionDebugInfo = {
        userId: user?.id || null,
        isAuthenticated: !!user,
        userRoles: userRoles || [],
        profileData: profileData || null,
        hasAdminRole: hasAdminResult || false,
        hasSuperAdminRole: hasSuperAdminResult || false,
        canAccessAgencias: !agenciasError,
        canAccessDeals: !dealsError,
        canAccessProjetos: !projetosError
      };
      
      setDebugInfo(debugData);
      console.log('✅ Debug de permissões concluído:', debugData);
      
    } catch (err: any) {
      console.error('💥 Erro no teste de permissões:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          🔍 Testando Permissões...
        </h3>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          ❌ Erro no Teste de Permissões
        </h3>
        <p className="text-red-700">{error}</p>
        <button 
          onClick={testPermissions}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-blue-800 mb-3">
        🔐 Debug de Permissões
      </h3>
      
      {debugInfo && (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>👤 Usuário:</strong>
              <p className={debugInfo.isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                {debugInfo.isAuthenticated ? '✅ Autenticado' : '❌ Não autenticado'}
              </p>
              <p className="text-xs text-gray-600">{debugInfo.userId}</p>
            </div>
            
            <div>
              <strong>🎭 Roles:</strong>
              <p className={debugInfo.userRoles.length > 0 ? 'text-green-600' : 'text-orange-600'}>
                {debugInfo.userRoles.length} role(s)
              </p>
              {debugInfo.userRoles.map((role, index) => (
                <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1">
                  {role.role}
                </span>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>🔐 Funções de Permissão:</strong>
              <p className={debugInfo.hasAdminRole ? 'text-green-600' : 'text-red-600'}>
                is_admin(): {debugInfo.hasAdminRole ? '✅' : '❌'}
              </p>
              <p className={debugInfo.hasSuperAdminRole ? 'text-green-600' : 'text-red-600'}>
                is_super_admin(): {debugInfo.hasSuperAdminRole ? '✅' : '❌'}
              </p>
            </div>
            
            <div>
              <strong>📊 Acesso às Tabelas:</strong>
              <p className={debugInfo.canAccessAgencias ? 'text-green-600' : 'text-red-600'}>
                Agências: {debugInfo.canAccessAgencias ? '✅' : '❌'}
              </p>
              <p className={debugInfo.canAccessDeals ? 'text-green-600' : 'text-red-600'}>
                Deals: {debugInfo.canAccessDeals ? '✅' : '❌'}
              </p>
              <p className={debugInfo.canAccessProjetos ? 'text-green-600' : 'text-red-600'}>
                Projetos: {debugInfo.canAccessProjetos ? '✅' : '❌'}
              </p>
            </div>
          </div>
          
          {debugInfo.profileData && (
            <div>
              <strong>👤 Dados do Perfil:</strong>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(debugInfo.profileData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
      
      <button 
        onClick={testPermissions}
        className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        🔄 Atualizar Teste
      </button>
    </div>
  );
};

export default DebugPermissions;