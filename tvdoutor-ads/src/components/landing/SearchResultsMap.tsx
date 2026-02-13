import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { type ScreenSearchResult } from '@/lib/search-service';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface SearchResultsMapProps {
  screens: ScreenSearchResult[];
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  loading?: boolean;
}

export function SearchResultsMap({ screens, centerLat, centerLng, radiusKm, loading = false }: SearchResultsMapProps) {
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const centerMarker = useRef<mapboxgl.Marker | null>(null);

  // Callback para quando o container for montado
  const handleContainerRef = (node: HTMLDivElement | null) => {
    if (mapContainer.current !== node) {
      (mapContainer as any).current = node;
    }
    if (node) {
      console.log('🎯 Container do mapa montado no DOM');
      // Tentar inicializar o mapa se o token já estiver disponível
      if (mapboxToken && !map.current) {
        console.log('🔄 Container montado, tentando inicializar mapa');
        setTimeout(() => initializeMap(), 100); // Pequeno delay para garantir que o DOM está pronto
      }
    }
  };

  useEffect(() => {
    fetchMapboxToken();
  }, []);

  useEffect(() => {
    if (mapboxToken && !map.current && mapContainer.current) {
      console.log('🔄 Iniciando mapa com token disponível');
      initializeMap();
    } else {
      console.log('⏳ Aguardando condições para inicializar mapa:', {
        hasToken: !!mapboxToken,
        hasMap: !!map.current,
        hasContainer: !!mapContainer.current
      });
    }
  }, [mapboxToken, centerLat, centerLng]);

  useEffect(() => {
    if (map.current && screens.length > 0) {
      updateMapMarkers();
    }
  }, [screens, centerLat, centerLng, radiusKm]);

  // Garantir que o mapa seja inicializado quando o container estiver disponível
  useEffect(() => {
    if (mapboxToken && !map.current && mapContainer.current) {
      console.log('🔄 Container disponível, tentando inicializar mapa');
      initializeMap();
    }
  }, [mapboxToken]);

  const fetchMapboxToken = async () => {
    try {
      console.log('🗺️ Buscando token do Mapbox para mapa de resultados...');
      
      // Usar token diretamente do arquivo .env
      const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
      
      if (!token) {
        console.warn('⚠️ Token do Mapbox não configurado. Configure VITE_MAPBOX_ACCESS_TOKEN no .env');
        setMapError('Token do Mapbox não configurado. Configure VITE_MAPBOX_ACCESS_TOKEN.');
        return;
      }

      console.log('✅ Token do Mapbox obtido com sucesso');
      setMapboxToken(token);
      setMapError(null);
    } catch (error) {
      console.error('💥 Erro ao buscar token do Mapbox:', error);
      setMapError('Erro de conexão ao buscar token do mapa');
    }
  };

  const initializeMap = () => {
    if (!mapboxToken || !mapContainer.current || map.current) {
      console.log('🚫 Não foi possível inicializar o mapa');
      return;
    }

    console.log('🗺️ Inicializando mapa de resultados...');
    
    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [centerLng, centerLat],
        zoom: 12
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      map.current.on('load', () => {
        console.log('✅ Mapa de resultados carregado com sucesso');
        setMapLoading(false);
        updateMapMarkers();
      });

      map.current.on('error', (e) => {
        console.error('💥 Erro no mapa:', e);
        setMapError('Erro ao carregar o mapa: ' + e.error?.message);
      });

    } catch (error) {
      console.error('💥 Erro ao criar mapa:', error);
      setMapError('Erro ao inicializar o mapa: ' + (error as Error).message);
    }
  };

  const updateMapMarkers = () => {
    if (!map.current) return;

    // Limpar marcadores existentes
    markers.current.forEach(marker => marker.remove());
    markers.current = [];
    if (centerMarker.current) {
      centerMarker.current.remove();
      centerMarker.current = null;
    }

    // Adicionar marcador do centro da busca
    const centerEl = document.createElement('div');
    centerEl.className = 'center-marker';
    centerEl.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: #3B82F6;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
    `;

    centerMarker.current = new mapboxgl.Marker(centerEl)
      .setLngLat([centerLng, centerLat])
      .setPopup(new mapboxgl.Popup().setHTML(`
        <div class="p-2">
          <h3 class="font-bold text-sm">Centro da Busca</h3>
          <p class="text-xs text-gray-600">Raio: ${radiusKm}km</p>
        </div>
      `))
      .addTo(map.current);

    // Adicionar marcadores das telas
    screens.forEach(screen => {
      if (!screen.lat || !screen.lng) return;

      // Criar elemento customizado para o marcador
      const el = document.createElement('div');
      el.className = 'screen-marker';
      el.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: #10B981;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: white;
      `;
      el.textContent = screen.class.charAt(0).toUpperCase();

      // Criar popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false
      }).setHTML(`
        <div class="p-3 min-w-[200px]">
          <h3 class="font-bold text-sm mb-2">${screen.display_name}</h3>
          <div class="space-y-1 text-xs">
            <div><strong>Localização:</strong> ${screen.city}, ${screen.state}</div>
            <div><strong>Distância:</strong> ${screen.distance}km</div>
            <div><strong>Classe:</strong> ${screen.class}</div>
            <div><strong>Audiência:</strong> ${screen.audience.toLocaleString()} pessoas/mês</div>
            <div><strong>Preço:</strong> R$ ${screen.price.toFixed(2)}/semana</div>
          </div>
        </div>
      `);

      // Criar marcador
      const marker = new mapboxgl.Marker(el)
        .setLngLat([screen.lng, screen.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);
    });

    // Ajustar zoom para mostrar todos os marcadores
    if (screens.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      
      // Incluir o centro da busca
      bounds.extend([centerLng, centerLat]);
      
      // Incluir todas as telas
      screens.forEach(screen => {
        if (screen.lat && screen.lng) {
          bounds.extend([screen.lng, screen.lat]);
        }
      });
      
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15
        });
      }
    }
  };

  if (loading || mapLoading) {
    return (
      <Card className="h-96">
        <CardContent className="p-8 flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground text-lg">Carregando mapa...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Configurando visualização das telas encontradas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mapError) {
    return (
      <Card className="h-96">
        <CardContent className="p-8 flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Mapa indisponível</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {mapError}
            </p>
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertDescription className="text-yellow-800 text-xs">
                <strong>Para configurar o mapa:</strong>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Acesse o painel do Supabase</li>
                  <li>Vá em Edge Functions → Secrets</li>
                  <li>Adicione MAPBOX_PUBLIC_TOKEN com seu token público</li>
                </ol>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-96">
      <CardContent className="p-0 h-full">
        <div 
          ref={handleContainerRef} 
          className="w-full h-full rounded-lg"
          style={{ minHeight: '384px' }}
        />
      </CardContent>
    </Card>
  );
}