import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, MapPin, AlertCircle, CheckCircle, Layers } from 'lucide-react';
import L from 'leaflet';

// Importe os estilos do Leaflet
import 'leaflet/dist/leaflet.css';
// Importe a configuração do Leaflet
import '@/lib/leaflet-config';

// Dados mockados para demonstração
const mockHeatmapData = [
  { lat: -23.5505, lng: -46.6333, intensity: 0.8, name: 'São Paulo Centro', proposals: 15 },
  { lat: -23.5515, lng: -46.6343, intensity: 0.6, name: 'São Paulo Norte', proposals: 12 },
  { lat: -23.5495, lng: -46.6323, intensity: 0.4, name: 'São Paulo Sul', proposals: 8 },
  { lat: -23.5525, lng: -46.6353, intensity: 0.9, name: 'São Paulo Oeste', proposals: 18 },
  { lat: -23.5485, lng: -46.6313, intensity: 0.3, name: 'São Paulo Leste', proposals: 6 },
  { lat: -23.5535, lng: -46.6363, intensity: 0.7, name: 'São Paulo Centro-Norte', proposals: 14 },
  { lat: -23.5475, lng: -46.6303, intensity: 0.5, name: 'São Paulo Centro-Sul', proposals: 10 },
];

interface SimpleHeatmapProps {
  onClose?: () => void;
}

export const SimpleHeatmap: React.FC<SimpleHeatmapProps> = ({ onClose }) => {
  const [mapView, setMapView] = useState<'markers' | 'heatmap'>('markers');
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'working' | 'failed'>('checking');

  // Testar API
  useEffect(() => {
    const testAPI = async () => {
      try {
        setLoading(true);
        const { supabase } = await import('@/integrations/supabase/client');
        
        const { data, error } = await supabase.functions.invoke('maps-heatmap', {
          body: { stats: true }
        });
        
        if (error) {
          console.log('API não disponível, usando dados mockados:', error.message);
          setApiStatus('failed');
        } else {
          console.log('API funcionando, mas sem dados reais');
          setApiStatus('working');
        }
      } catch (error) {
        console.log('Erro ao testar API, usando dados mockados:', error);
        setApiStatus('failed');
      } finally {
        setLoading(false);
      }
    };

    testAPI();
  }, []);

  // Criar ícones customizados
  const createCustomIcon = (intensity: number) => {
    const color = intensity > 0.7 ? '#ef4444' : 
                  intensity > 0.5 ? '#f59e0b' : 
                  intensity > 0.3 ? '#10b981' : '#3b82f6';
    
    return L.divIcon({
      html: `<div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 10px;
      ">${Math.round(intensity * 10)}</div>`,
      className: 'custom-marker-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  // Preparar dados para heatmap (usando Leaflet.heat)
  const heatmapData = useMemo(() => {
    return mockHeatmapData.map(point => [point.lat, point.lng, point.intensity]);
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Calor - Demonstração
          </CardTitle>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>
        
        {/* Status da API */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Status da API:</span>
            {apiStatus === 'checking' && (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-blue-600">Verificando...</span>
              </>
            )}
            {apiStatus === 'working' && (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-600">Funcionando</span>
              </>
            )}
            {apiStatus === 'failed' && (
              <>
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-orange-600">Usando dados de demonstração</span>
              </>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setMapView('markers')}
              size="sm"
              variant={mapView === 'markers' ? 'default' : 'outline'}
            >
              <MapPin className="h-4 w-4 mr-1" />
              Marcadores
            </Button>
            <Button
              onClick={() => setMapView('heatmap')}
              size="sm"
              variant={mapView === 'heatmap' ? 'default' : 'outline'}
            >
              <Layers className="h-4 w-4 mr-1" />
              Heatmap
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Alertas */}
        {apiStatus === 'failed' && (
          <Alert className="mb-4 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Modo Demonstração:</strong> A API não está disponível ou não há dados reais. 
              Exibindo dados de exemplo para demonstração do mapa de calor.
            </AlertDescription>
          </Alert>
        )}

        {/* Mapa */}
        <div className="rounded-lg overflow-hidden border" style={{ height: '500px' }}>
          <MapContainer 
            center={[-23.5505, -46.6333]} // São Paulo
            zoom={12} 
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            {/* Camada base do mapa */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Marcadores individuais */}
            {mapView === 'markers' && mockHeatmapData.map((point, index) => (
              <Marker
                key={index}
                position={[point.lat, point.lng]}
                icon={createCustomIcon(point.intensity)}
              >
                <Popup>
                  <div className="p-2">
                    <div className="font-medium">{point.name}</div>
                    <div className="text-sm text-gray-600">
                      Propostas: {point.proposals}
                    </div>
                    <div className="text-sm text-gray-600">
                      Intensidade: {(point.intensity * 100).toFixed(0)}%
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Heatmap (simulado com marcadores coloridos) */}
            {mapView === 'heatmap' && (
              <>
                {/* Simular heatmap com marcadores coloridos e transparentes */}
                {mockHeatmapData.map((point, index) => (
                  <Marker
                    key={`heat-${index}`}
                    position={[point.lat, point.lng]}
                    icon={L.divIcon({
                      html: `<div style="
                        background-color: ${point.intensity > 0.7 ? '#ef4444' : 
                                          point.intensity > 0.5 ? '#f59e0b' : 
                                          point.intensity > 0.3 ? '#10b981' : '#3b82f6'};
                        width: ${20 + point.intensity * 40}px;
                        height: ${20 + point.intensity * 40}px;
                        border-radius: 50%;
                        opacity: 0.6;
                        border: 2px solid rgba(255,255,255,0.8);
                        box-shadow: 0 0 ${10 + point.intensity * 20}px rgba(0,0,0,0.3);
                      "></div>`,
                      className: 'custom-heatmap-icon',
                      iconSize: [60 + point.intensity * 40, 60 + point.intensity * 40],
                      iconAnchor: [30 + point.intensity * 20, 30 + point.intensity * 20]
                    })}
                  />
                ))}
              </>
            )}
          </MapContainer>
        </div>
        
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{mockHeatmapData.length}</div>
            <div className="text-sm text-gray-600">Total de Pontos</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {Math.max(...mockHeatmapData.map(d => d.intensity * 100)).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">Máx. Intensidade</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {(mockHeatmapData.reduce((sum, d) => sum + d.proposals, 0) / mockHeatmapData.length).toFixed(0)}
            </div>
            <div className="text-sm text-gray-600">Média Propostas</div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">1</div>
            <div className="text-sm text-gray-600">Cidade (SP)</div>
          </div>
        </div>

        {/* Legenda */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">🎨 Interpretação das Cores:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span>Azul: Baixa (0-30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Verde: Média (30-50%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span>Amarelo: Alta (50-70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span>Vermelho: Muito Alta (70%+)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
