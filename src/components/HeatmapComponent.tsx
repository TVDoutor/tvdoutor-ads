import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useHeatmapData, HeatmapFilters } from '@/hooks/useHeatmapData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, MapPin, AlertCircle, Layers } from 'lucide-react';
import L from 'leaflet';
import 'leaflet.heat';

// Importe os estilos do Leaflet
import 'leaflet/dist/leaflet.css';
// Importe a configuração do Leaflet
import '@/lib/leaflet-config';

// Tipo para os dados que virão da nossa API
type HeatmapData = [number, number, number][]; // [lat, lng, intensity]

interface HeatmapComponentProps {
  filters?: HeatmapFilters;
  showClusters?: boolean;
  showHeatmap?: boolean;
  mockData?: Array<{ lat: number; lng: number; intensity: number }>;
}

// Componente para adicionar heatmap ao mapa
const HeatmapLayer: React.FC<{ data: HeatmapData }> = ({ data }) => {
  const map = useMap();

  useEffect(() => {
    if (data && data.length > 0) {
      // Criar camada de heatmap usando leaflet.heat
      const heatLayer = (L as any).heatLayer(data, {
        radius: 25,
        blur: 15,
        maxZoom: 18,
        max: 1.0,
        gradient: {
          0.0: 'blue',
          0.3: 'cyan',
          0.5: 'lime',
          0.7: 'yellow',
          1.0: 'red'
        }
      }).addTo(map);

      // Cleanup
      return () => {
        map.removeLayer(heatLayer);
      };
    }
  }, [data, map]);

  return null;
};

export const HeatmapComponent: React.FC<HeatmapComponentProps> = ({
  filters = {},
  showClusters = true,
  showHeatmap = true,
  mockData = []
}) => {
  const { heatmapData, loading, error, refetch } = useHeatmapData(filters);
  const [data, setData] = useState<HeatmapData>([]);
  const [mapView, setMapView] = useState<'heatmap' | 'clusters'>('heatmap');

  useEffect(() => {
    // Usar dados mockados se não houver dados reais
    const sourceData = heatmapData.length > 0 ? heatmapData : mockData;
    
    // Converter os dados para o formato esperado pelo HeatmapLayer
    const formattedData: HeatmapData = sourceData.map(point => [
      point.lat,
      point.lng,
      point.intensity
    ]);
    setData(formattedData);
  }, [heatmapData, mockData]);

  // Criar ícones customizados para os clusters
  const createCustomIcon = (count: number) => {
    const size = count > 100 ? 'large' : count > 10 ? 'medium' : 'small';
    const colors = {
      small: '#3B82F6',
      medium: '#F59E0B', 
      large: '#EF4444'
    };
    
    return L.divIcon({
      html: `<div style="
        background-color: ${colors[size]};
        width: ${size === 'large' ? '40px' : size === 'medium' ? '35px' : '30px'};
        height: ${size === 'large' ? '40px' : size === 'medium' ? '35px' : '30px'};
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${size === 'large' ? '14px' : size === 'medium' ? '12px' : '10px'};
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">${count}</div>`,
      className: 'custom-cluster-icon',
      iconSize: [size === 'large' ? 40 : size === 'medium' ? 35 : 30, size === 'large' ? 40 : size === 'medium' ? 35 : 30],
      iconAnchor: [size === 'large' ? 20 : size === 'medium' ? 17.5 : 15, size === 'large' ? 20 : size === 'medium' ? 17.5 : 15]
    });
  };

  // Preparar dados para clusters
  const clusterData = useMemo(() => {
    const sourceData = heatmapData.length > 0 ? heatmapData : mockData;
    return sourceData.map((point, index) => ({
      id: index,
      position: [point.lat, point.lng] as [number, number],
      intensity: point.intensity,
      popup: `Intensidade: ${point.intensity}`
    }));
  }, [heatmapData, mockData]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Carregando mapa de calor...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Erro ao carregar dados</span>
          </div>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button 
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2 inline" />
            Tentar Novamente
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de Calor - Popularidade de Telas por Propostas
          </CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setMapView('heatmap')}
              className={`px-3 py-1 text-sm rounded ${
                mapView === 'heatmap' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Layers className="h-4 w-4 mr-1 inline" />
              Heatmap
            </button>
            <button
              onClick={() => setMapView('clusters')}
              className={`px-3 py-1 text-sm rounded ${
                mapView === 'clusters' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <MapPin className="h-4 w-4 mr-1 inline" />
              Clusters
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {data.length} pontos de dados carregados
          {filters.normalize && (
            <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
              Dados Normalizados
            </span>
          )}
          {heatmapData.length === 0 && mockData.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
              Dados de Demonstração
            </span>
          )}
          {heatmapData.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
              Dados Reais
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg overflow-hidden border" style={{ height: '600px' }}>
          <MapContainer 
            center={[-23.5505, -46.6333]} // São Paulo como centro padrão
            zoom={10} 
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            {/* Camada base do mapa (OpenStreetMap) */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Camada de Heatmap */}
            {showHeatmap && mapView === 'heatmap' && data.length > 0 && (
              <HeatmapLayer data={data} />
            )}

            {/* Camada de Clusters */}
            {showClusters && mapView === 'clusters' && clusterData.length > 0 && (
              <MarkerClusterGroup
                chunkedLoading
                iconCreateFunction={(cluster: any) => {
                  const count = cluster.getChildCount();
                  return createCustomIcon(count);
                }}
                maxClusterRadius={50}
                spiderfyOnMaxZoom={true}
                showCoverageOnHover={false}
                zoomToBoundsOnClick={true}
              >
                {clusterData.map((point) => (
                  <Marker
                    key={point.id}
                    position={point.position}
                    icon={L.divIcon({
                      html: `<div style="
                        background-color: #3B82F6;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        border: 2px solid white;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                      "></div>`,
                      className: 'custom-marker-icon',
                      iconSize: [20, 20],
                      iconAnchor: [10, 10]
                    })}
                  >
                    <Popup>
                      <div className="p-2">
                        <div className="font-medium">Tela</div>
                        <div className="text-sm text-gray-600">
                          Intensidade: {point.intensity}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            )}
          </MapContainer>
        </div>
        
        {data.length === 0 && !loading && (
          <div className="text-center p-8 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <div>Nenhum dado de heatmap encontrado</div>
            <div className="text-sm mt-1">Verifique se existem propostas com telas geolocalizadas</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
