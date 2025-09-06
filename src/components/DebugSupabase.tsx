import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DebugSupabase = () => {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testQueries = async () => {
      console.log('🧪 Iniciando testes de conectividade do Supabase...');
      
      try {
        // Teste 1: Verificar conexão básica
        console.log('1️⃣ Testando conexão básica...');
        const { data: authData, error: authError } = await supabase.auth.getUser();
        console.log('Auth status:', { user: authData?.user?.id, error: authError });

        // Teste 2: Listar tabelas disponíveis
        console.log('2️⃣ Testando acesso às tabelas...');
        
        // Teste agências
        const { data: agenciasData, error: agenciasError } = await supabase
          .from('agencias')
          .select('*')
          .limit(5);
        
        console.log('Agências:', { count: agenciasData?.length, data: agenciasData, error: agenciasError });

        // Teste deals
        const { data: dealsData, error: dealsError } = await supabase
          .from('agencia_deals')
          .select('*')
          .limit(5);
        
        console.log('Deals:', { count: dealsData?.length, data: dealsData, error: dealsError });

        // Teste projetos
        const { data: projetosData, error: projetosError } = await supabase
          .from('agencia_projetos')
          .select('*')
          .limit(5);
        
        console.log('Projetos:', { count: projetosData?.length, data: projetosData, error: projetosError });

        // Teste contatos
        const { data: contatosData, error: contatosError } = await supabase
          .from('agencia_contatos')
          .select('*')
          .limit(5);
        
        console.log('Contatos:', { count: contatosData?.length, data: contatosData, error: contatosError });

        setResults({
          auth: { user: authData?.user?.id, error: authError?.message },
          agencias: { count: agenciasData?.length || 0, error: agenciasError?.message },
          deals: { count: dealsData?.length || 0, error: dealsError?.message },
          projetos: { count: projetosData?.length || 0, error: projetosError?.message },
          contatos: { count: contatosData?.length || 0, error: contatosError?.message }
        });

      } catch (error) {
        console.error('❌ Erro nos testes:', error);
        setResults({ error: error instanceof Error ? error.message : String(error) });
      } finally {
        setLoading(false);
      }
    };

    testQueries();
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800">🧪 Testando Conectividade Supabase...</h3>
        <p className="text-blue-600">Verificando acesso às tabelas...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className="font-semibold text-gray-800 mb-3">🔍 Resultados dos Testes Supabase</h3>
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>Autenticação:</strong>
            <p className={results.auth?.error ? 'text-red-600' : 'text-green-600'}>
              {results.auth?.error || `Usuário: ${results.auth?.user || 'Conectado'}`}
            </p>
          </div>
          <div>
            <strong>Agências:</strong>
            <p className={results.agencias?.error ? 'text-red-600' : 'text-green-600'}>
              {results.agencias?.error || `${results.agencias?.count || 0} registros`}
            </p>
          </div>
          <div>
            <strong>Deals:</strong>
            <p className={results.deals?.error ? 'text-red-600' : 'text-green-600'}>
              {results.deals?.error || `${results.deals?.count || 0} registros`}
            </p>
          </div>
          <div>
            <strong>Projetos:</strong>
            <p className={results.projetos?.error ? 'text-red-600' : 'text-green-600'}>
              {results.projetos?.error || `${results.projetos?.count || 0} registros`}
            </p>
          </div>
          <div>
            <strong>Contatos:</strong>
            <p className={results.contatos?.error ? 'text-red-600' : 'text-green-600'}>
              {results.contatos?.error || `${results.contatos?.count || 0} registros`}
            </p>
          </div>
        </div>
        {results.error && (
          <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-red-700">
            <strong>Erro Geral:</strong> {results.error}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugSupabase;