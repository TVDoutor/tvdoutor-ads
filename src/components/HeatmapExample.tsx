import React, { useEffect, useRef } from 'react';
import { useHeatmapData } from '@/hooks/useHeatmapData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, MapPin, TrendingUp } from 'lucide-react';

// Exemplo de como usar o hook useHeatmapData
export const HeatmapExample: React.FC = () => {
  const { heatmapData, loading, error, refetch } = useHeatmapData();
  const mapContainer = useRef<HTMLDivElement>(null);

  // Estatísticas dos dados
  const totalPoints = heatmapData.length;
  const maxIntensity = heatmapData.length > 0 ? Math.max(...heatmapData.map(d => d.intensity)) : 0;
  const avgIntensity = heatmapData.length > 0 
    ? (heatmapData.reduce((sum, d) => sum + d.intensity, 0) / heatmapData.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Dados do Heatmap de Propostas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalPoints}</div>
              <div className="text-sm text-blue-800">Telas com Propostas</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{maxIntensity}</div>
              <div className="text-sm text-green-800">Máx. Propostas/Tela</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{avgIntensity}</div>
              <div className="text-sm text-purple-800">Média Propostas/Tela</div>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Carregando dados do heatmap...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 font-medium">Erro ao carregar dados</div>
              <div className="text-red-600 text-sm mt-1">{error}</div>
              <Button 
                onClick={refetch} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          )}

          {!loading && !error && heatmapData.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Dados Carregados</h3>
                <Button onClick={refetch} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
              
              {/* Exemplo de como os dados podem ser usados */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Exemplo de uso com bibliotecas de mapa:</h4>
                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
{`// Para usar com Mapbox GL JS
const heatmapData = ${JSON.stringify(heatmapData.slice(0, 3), null, 2)}...;

// Adicionar ao mapa
map.addSource('heatmap', {
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: heatmapData.map(point => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.lng, point.lat]
      },
      properties: {
        intensity: point.intensity
      }
    }))
  }
});

// Adicionar layer de heatmap
map.addLayer({
  id: 'heatmap-layer',
  type: 'heatmap',
  source: 'heatmap',
  paint: {
    'heatmap-weight': {
      property: 'intensity',
      type: 'exponential',
      stops: [
        [0, 0],
        [1, 1]
      ]
    },
    'heatmap-intensity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 1,
      15, 3
    ],
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(33,102,172,0)',
      0.2, 'rgb(103,169,207)',
      0.4, 'rgb(209,229,240)',
      0.6, 'rgb(253,219,199)',
      0.8, 'rgb(239,138,98)',
      1, 'rgb(178,24,43)'
    ]
  }
});`}
                </pre>
              </div>
            </div>
          )}

          {!loading && !error && heatmapData.length === 0 && (
            <div className="text-center p-8 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div>Nenhum dado de heatmap encontrado</div>
              <div className="text-sm mt-1">Verifique se existem propostas com telas geolocalizadas</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

