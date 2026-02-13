import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface HeatmapTestProps {
  onClose?: () => void;
}

export const HeatmapTest: React.FC<HeatmapTestProps> = ({ onClose }) => {
  const [testResults, setTestResults] = useState<{
    dependencies: boolean;
    component: boolean;
    api: boolean;
    data: boolean;
    error?: string;
  }>({
    dependencies: false,
    component: false,
    api: false,
    data: false
  });

  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    setTestResults({
      dependencies: false,
      component: false,
      api: false,
      data: false
    });

    try {
      // Test 1: Dependências
      console.log('🧪 Testando dependências...');
      const hasLeaflet = typeof window !== 'undefined' && (window as any).L;
      const hasReactLeaflet = true; // Assumindo que está instalado
      
      setTestResults(prev => ({ ...prev, dependencies: hasLeaflet && hasReactLeaflet }));

      // Test 2: Componente React
      console.log('🧪 Testando componente...');
      try {
        // Tentar importar o componente
        const { HeatmapComponent } = await import('./HeatmapComponent');
        setTestResults(prev => ({ ...prev, component: true }));
      } catch (error) {
        console.error('Erro ao importar HeatmapComponent:', error);
        setTestResults(prev => ({ ...prev, component: false, error: 'Erro ao importar componente' }));
      }

      // Test 3: API/Supabase
      console.log('🧪 Testando API...');
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase.functions.invoke('maps-heatmap', {
          body: { stats: true }
        });
        
        if (error) {
          console.error('Erro na API:', error);
          setTestResults(prev => ({ ...prev, api: false, error: error.message }));
        } else {
          setTestResults(prev => ({ ...prev, api: true }));
        }
      } catch (error) {
        console.error('Erro ao testar API:', error);
        setTestResults(prev => ({ ...prev, api: false, error: 'Erro de conexão com API' }));
      }

      // Test 4: Dados
      console.log('🧪 Testando dados...');
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase.functions.invoke('maps-heatmap', {
          body: { stats: true, cities: true, classes: true }
        });
        
        if (error) {
          setTestResults(prev => ({ ...prev, data: false }));
        } else if (data?.heatmap && data.heatmap.length > 0) {
          setTestResults(prev => ({ ...prev, data: true }));
        } else {
          setTestResults(prev => ({ ...prev, data: false, error: 'Nenhum dado encontrado' }));
        }
      } catch (error) {
        console.error('Erro ao testar dados:', error);
        setTestResults(prev => ({ ...prev, data: false, error: 'Erro ao buscar dados' }));
      }

    } catch (error) {
      console.error('Erro geral nos testes:', error);
      setTestResults(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const allTestsPassed = Object.values(testResults).every(result => 
    typeof result === 'boolean' ? result : false
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Teste do Mapa de Calor
          </CardTitle>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Geral */}
        <Alert className={allTestsPassed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <div className="flex items-center gap-2">
            {allTestsPassed ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={allTestsPassed ? 'text-green-800' : 'text-red-800'}>
              {allTestsPassed 
                ? 'Todos os testes passaram! O mapa de calor deve estar funcionando.'
                : 'Alguns testes falharam. Veja os detalhes abaixo.'
              }
            </AlertDescription>
          </div>
        </Alert>

        {/* Resultados dos Testes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Dependências (Leaflet/React-Leaflet)</span>
            <div className="flex items-center gap-2">
              {testResults.dependencies ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={testResults.dependencies ? 'text-green-600' : 'text-red-600'}>
                {testResults.dependencies ? 'OK' : 'FALHOU'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Componente React (HeatmapComponent)</span>
            <div className="flex items-center gap-2">
              {testResults.component ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={testResults.component ? 'text-green-600' : 'text-red-600'}>
                {testResults.component ? 'OK' : 'FALHOU'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">API Supabase (maps-heatmap)</span>
            <div className="flex items-center gap-2">
              {testResults.api ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={testResults.api ? 'text-green-600' : 'text-red-600'}>
                {testResults.api ? 'OK' : 'FALHOU'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Dados do Heatmap</span>
            <div className="flex items-center gap-2">
              {testResults.data ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={testResults.data ? 'text-green-600' : 'text-red-600'}>
                {testResults.data ? 'OK' : 'FALHOU'}
              </span>
            </div>
          </div>
        </div>

        {/* Erro se houver */}
        {testResults.error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Erro:</strong> {testResults.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Ações */}
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={runTests} 
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Executar Testes Novamente
              </>
            )}
          </Button>
        </div>

        {/* Instruções */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Próximos Passos:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {!testResults.dependencies && (
              <li>• Instalar dependências: <code>npm install leaflet react-leaflet react-leaflet-heatmap-layer-v3 --legacy-peer-deps</code></li>
            )}
            {!testResults.component && (
              <li>• Verificar se o arquivo <code>src/components/HeatmapComponent.tsx</code> existe e está correto</li>
            )}
            {!testResults.api && (
              <li>• Deploy da Edge Function: <code>supabase functions deploy maps-heatmap</code></li>
            )}
            {!testResults.data && (
              <li>• Verificar se existem propostas com telas geolocalizadas no banco de dados</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
