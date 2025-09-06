import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Button } from './ui/button';
import { X, Bug, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface DebugLog {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  data?: any;
}

interface ProjectDebugData {
  user: any;
  permissions: any;
  formData: any;
  validationErrors: string[];
  databaseResponse: any;
  lastError: any;
}

const ProjectDebugPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugData, setDebugData] = useState<ProjectDebugData>({
    user: null,
    permissions: null,
    formData: null,
    validationErrors: [],
    databaseResponse: null,
    lastError: null
  });
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const addLog = (type: DebugLog['type'], message: string, data?: any) => {
    const newLog: DebugLog = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50)); // Manter apenas os últimos 50 logs
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testUserPermissions = async () => {
    try {
      addLog('info', 'Testando permissões do usuário...');
      
      // Verificar usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      addLog('success', 'Usuário obtido com sucesso', { userId: user?.id });
      
      // Verificar perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (profileError) {
        addLog('error', 'Erro ao buscar perfil', profileError);
      } else {
        addLog('success', 'Perfil encontrado', { role: profile.role });
      }
      
      // Testar função is_admin
      const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
      if (adminError) {
        addLog('error', 'Erro ao verificar is_admin', adminError);
      } else {
        addLog('info', 'Resultado is_admin', { isAdmin });
      }
      
      // Testar função is_super_admin
      const { data: isSuperAdmin, error: superAdminError } = await supabase.rpc('is_super_admin');
      if (superAdminError) {
        addLog('error', 'Erro ao verificar is_super_admin', superAdminError);
      } else {
        addLog('info', 'Resultado is_super_admin', { isSuperAdmin });
      }
      
      setDebugData(prev => ({
        ...prev,
        user,
        permissions: { profile, isAdmin, isSuperAdmin }
      }));
      
    } catch (error) {
      addLog('error', 'Erro geral no teste de permissões', error);
      setDebugData(prev => ({ ...prev, lastError: error }));
    }
  };

  const testProjectCreation = async (projectData: any) => {
    try {
      addLog('info', 'Iniciando teste de criação de projeto...', projectData);
      
      // Validar dados obrigatórios
      const requiredFields = ['nome', 'descricao', 'data_inicio', 'data_fim', 'orcamento_total'];
      const missingFields = requiredFields.filter(field => !projectData[field]);
      
      if (missingFields.length > 0) {
        addLog('warning', 'Campos obrigatórios faltando', { missingFields });
        setDebugData(prev => ({ ...prev, validationErrors: missingFields }));
        return;
      }
      
      addLog('success', 'Validação de campos passou');
      
      // Testar inserção no banco
      const { data, error } = await supabase
        .from('agencia_projetos')
        .insert([projectData])
        .select();
      
      if (error) {
        addLog('error', 'Erro na inserção do projeto', error);
        setDebugData(prev => ({ ...prev, lastError: error, databaseResponse: null }));
      } else {
        addLog('success', 'Projeto criado com sucesso', data);
        setDebugData(prev => ({ ...prev, databaseResponse: data, lastError: null }));
      }
      
    } catch (error) {
      addLog('error', 'Erro geral na criação do projeto', error);
      setDebugData(prev => ({ ...prev, lastError: error }));
    }
  };

  const testDatabaseConnection = async () => {
    try {
      addLog('info', 'Testando conexão com o banco...');
      
      // Testar acesso à tabela agencia_projetos
      const { data, error } = await supabase
        .from('agencia_projetos')
        .select('count')
        .limit(1);
      
      if (error) {
        addLog('error', 'Erro na conexão com agencia_projetos', error);
      } else {
        addLog('success', 'Conexão com agencia_projetos OK');
      }
      
      // Testar acesso à tabela agencias
      const { data: agenciasData, error: agenciasError } = await supabase
        .from('agencias')
        .select('count')
        .limit(1);
      
      if (agenciasError) {
        addLog('error', 'Erro na conexão com agencias', agenciasError);
      } else {
        addLog('success', 'Conexão com agencias OK');
      }
      
    } catch (error) {
      addLog('error', 'Erro geral na conexão com banco', error);
    }
  };

  const getLogIcon = (type: DebugLog['type']) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLogColor = (type: DebugLog['type']) => {
    switch (type) {
      case 'error': return 'text-red-700 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'success': return 'text-green-700 bg-green-50 border-green-200';
      default: return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  // Expor funções globalmente para uso em outros componentes
  useEffect(() => {
    (window as any).projectDebug = {
      testProjectCreation,
      testUserPermissions,
      testDatabaseConnection,
      addLog,
      openPopup: () => setIsOpen(true)
    };
    
    return () => {
      delete (window as any).projectDebug;
    };
  }, []);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-purple-600 hover:bg-purple-700"
        size="sm"
      >
        <Bug className="w-4 h-4 mr-2" />
        Debug Projeto
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-purple-50">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-purple-800">Debug - Cadastro de Projeto</h2>
          </div>
          <Button
            onClick={() => setIsOpen(false)}
            variant="ghost"
            size="sm"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Painel de Controles */}
          <div className="w-1/3 border-r p-4 space-y-4">
            <h3 className="font-semibold text-gray-800">Testes Disponíveis</h3>
            
            <div className="space-y-2">
              <Button
                onClick={testUserPermissions}
                className="w-full justify-start"
                variant="outline"
              >
                🔐 Testar Permissões
              </Button>
              
              <Button
                onClick={testDatabaseConnection}
                className="w-full justify-start"
                variant="outline"
              >
                🔗 Testar Conexão DB
              </Button>
              
              <Button
                onClick={clearLogs}
                className="w-full justify-start"
                variant="outline"
              >
                🗑️ Limpar Logs
              </Button>
            </div>

            {/* Dados de Debug */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-700 mb-2">Dados Atuais</h4>
              <div className="text-xs space-y-1">
                <div>Usuário: {debugData.user?.id ? '✅' : '❌'}</div>
                <div>Permissões: {debugData.permissions ? '✅' : '❌'}</div>
                <div>Último Erro: {debugData.lastError ? '❌' : '✅'}</div>
                <div>Logs: {logs.length}</div>
              </div>
            </div>

            {/* Instruções */}
            <div className="mt-6 p-3 bg-gray-50 rounded text-xs">
              <h4 className="font-medium mb-2">Como usar:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Execute os testes antes de criar projeto</li>
                <li>• Use window.projectDebug.testProjectCreation(data) no console</li>
                <li>• Monitore os logs em tempo real</li>
              </ul>
            </div>
          </div>

          {/* Painel de Logs */}
          <div className="flex-1 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Logs de Debug</h3>
              <span className="text-sm text-gray-500">{logs.length} entradas</span>
            </div>
            
            <div className="h-full overflow-y-auto space-y-2">
              {logs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Nenhum log ainda. Execute um teste para começar.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded border text-sm ${getLogColor(log.type)}`}
                  >
                    <div className="flex items-start gap-2">
                      {getLogIcon(log.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{log.message}</span>
                          <span className="text-xs opacity-70">{log.timestamp}</span>
                        </div>
                        {log.data && (
                          <pre className="text-xs bg-white bg-opacity-50 p-2 rounded mt-2 overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDebugPopup;