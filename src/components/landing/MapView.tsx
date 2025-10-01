import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { type ScreenSearchResult } from '@/lib/search-service';
import { useAuth } from '@/contexts/AuthContext';

interface MapViewProps {
  screens: ScreenSearchResult[];
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  loading?: boolean;
  focusScreen?: ScreenSearchResult | null;
}

export function MapView({ screens, centerLat, centerLng, radiusKm, loading = false, focusScreen }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Função para lidar com o clique em "Adicionar ao Carrinho"
  const handleAddToCart = () => {
    if (user) {
      // Se usuário estiver logado, redirecionar para propostas
      navigate('/propostas');
    } else {
      // Se não estiver logado, redirecionar para login
      navigate('/login');
    }
  };

  // Função para focar em um ponto específico no mapa
  const focusOnScreen = (screen: ScreenSearchResult) => {
    if (!mapInstanceRef.current || !screen.lat || !screen.lng) {
      console.log('❌ Não foi possível focar no screen:', screen.display_name);
      return;
    }

    console.log('🎯 Focando no screen:', screen.display_name, 'coords:', screen.lat, screen.lng);
    
    try {
      // Focar no ponto específico com zoom moderado
      mapInstanceRef.current.setView([screen.lat, screen.lng], 16, {
        animate: true,
        duration: 0.8
      });
      
      // Foco apenas no ponto, sem abrir popup automaticamente
      console.log('✅ Foco aplicado para:', screen.display_name);
      
    } catch (error) {
      console.error('❌ Erro ao focar no screen:', error);
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Disponibilizar função globalmente para o popup
    (window as any).handleAddToCart = handleAddToCart;

    // Importar Leaflet dinamicamente
    const initMap = async () => {
      try {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

        // Fix para ícones do Leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Limpar mapa existente
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
        }

        // Criar novo mapa
        const map = L.map(mapRef.current!).setView([centerLat, centerLng], 13);
        mapInstanceRef.current = map;

        // Adicionar camada de tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Adicionar marcador central
        const centerMarker = L.marker([centerLat, centerLng], {
          icon: L.divIcon({
            className: 'center-marker',
            html: `<div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
              <!-- Círculo de fundo brando com borda branca -->
              <div style="position: absolute; width: 40px; height: 40px; background: rgba(255, 255, 255, 0.9); border: 3px solid white; border-radius: 50%; box-shadow: 0 3px 8px rgba(0,0,0,0.3);"></div>
              <!-- Pin azul ciano centralizado -->
              <svg width="24" height="24" viewBox="0 0 24 24" style="position: relative; z-index: 1; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#06b6d4"/>
              </svg>
            </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          })
        }).addTo(map);

        centerMarker.bindPopup(`
          <div class="p-2">
            <h4 class="font-semibold text-blue-600">Centro da Busca</h4>
            <p class="text-sm text-gray-600">Raio: ${radiusKm}km</p>
            <p class="text-xs text-gray-500">${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}</p>
          </div>
        `);

        // Adicionar círculo do raio
        L.circle([centerLat, centerLng], {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          radius: radiusKm * 1000 // Converter km para metros
        }).addTo(map);

        // Adicionar marcadores numerados para cada tela
        screens.forEach((screen, index) => {
          if (screen.lat && screen.lng) {
            const getClassColor = () => {
              // Cores baseadas na imagem: azul ciano para marcadores numerados
              return '#06b6d4'; // azul ciano
            };

            const markerNumber = index + 1;
            const marker = L.marker([screen.lat, screen.lng], {
              icon: L.divIcon({
                className: 'screen-marker',
                html: `<div style="width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; background: ${getClassColor()}; font-weight: bold; color: white; font-size: 14px;">
                  ${markerNumber}
                </div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              })
            }).addTo(map);

            marker.bindPopup(`
              <div style="padding: 12px; min-width: 280px; max-width: 320px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background: #06b6d4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; font-weight: bold; font-size: 14px;">
                    ${markerNumber}
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <h4 style="font-weight: 600; color: #111827; font-size: 16px; margin: 0 0 2px 0; line-height: 1.3; word-wrap: break-word;">${screen.name || screen.code}</h4>
                    <p style="font-size: 12px; color: #0891b2; font-weight: 500; margin: 0; line-height: 1.4;">Código: ${screen.code}</p>
                  </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div style="background: #f9fafb; border-radius: 6px; padding: 10px;">
                    <h5 style="font-weight: 600; color: #374151; margin: 0 0 6px 0; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                      <span style="color: #3b82f6; font-size: 14px;">📍</span>
                      Localização
                    </h5>
                    <div style="display: flex; flex-direction: column; gap: 3px; font-size: 11px; line-height: 1.3;">
                      <div style="color: #374151;"><strong style="color: #111827;">Endereço:</strong> <span style="word-wrap: break-word;">${screen.address_raw}</span></div>
                      <div style="color: #374151;"><strong style="color: #111827;">Cidade:</strong> ${screen.city}, ${screen.state}</div>
                      <div style="color: #374151;"><strong style="color: #111827;">Distância:</strong> ${screen.distance}km do centro</div>
                    </div>
                  </div>
                  
                  <div style="background: #f9fafb; border-radius: 6px; padding: 10px;">
                    <h5 style="font-weight: 600; color: #374151; margin: 0 0 6px 0; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                      <span style="color: #10b981; font-size: 14px;">🏷️</span>
                      Classificação
                    </h5>
                    <div style="display: flex; flex-direction: column; gap: 3px; font-size: 11px; line-height: 1.3;">
                      <div style="color: #374151;"><strong style="color: #111827;">Classe:</strong> ${screen.class}</div>
                      <div style="color: #374151;"><strong style="color: #111827;">Status:</strong> ${screen.active ? 'Ativa' : 'Inativa'}</div>
                      ${screen.venue_name ? `<div style="color: #374151;"><strong style="color: #111827;">Local:</strong> ${screen.venue_name}</div>` : ''}
                    </div>
                  </div>
                  
                  <div style="background: #f9fafb; border-radius: 6px; padding: 10px;">
                    <h5 style="font-weight: 600; color: #374151; margin: 0 0 6px 0; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                      <span style="color: #8b5cf6; font-size: 14px;">📊</span>
                      Performance
                    </h5>
                    <div style="display: flex; flex-direction: column; gap: 3px; font-size: 11px; line-height: 1.3;">
                      <div style="color: #374151;"><strong style="color: #111827;">Alcance:</strong> ${screen.reach.toLocaleString()} pessoas/semana</div>
                      <div style="color: #374151;"><strong style="color: #111827;">Investimento:</strong> R$ ${screen.price.toFixed(2)}/semana</div>
                      <div style="color: #374151;"><strong style="color: #111827;">CPM:</strong> R$ ${(screen.price / (screen.reach / 1000)).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                
                <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
                  <button onclick="window.handleAddToCart && window.handleAddToCart()" style="width: 100%; background: #06b6d4; color: white; font-weight: 500; padding: 8px 12px; border-radius: 6px; border: none; cursor: pointer; font-size: 12px; transition: background-color 0.2s;" onmouseover="this.style.background='#0891b2'" onmouseout="this.style.background='#06b6d4'">
                    ${user ? 'Criar Proposta' : 'Quero anunciar aqui'}
                  </button>
                </div>
              </div>
            `);
          }
        });

        // Ajustar zoom para mostrar todos os marcadores
        if (screens.length > 0) {
          const markers = [centerMarker, ...screens.map(screen => 
            screen.lat && screen.lng ? L.marker([screen.lat, screen.lng]) : null
          ).filter(Boolean) as any[]];
          const group = L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.1));
        }

      } catch (error) {
        console.error('Erro ao carregar o mapa:', error);
        // Fallback para placeholder se o mapa falhar
      }
    };

    initMap();

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      // Limpar função global
      delete (window as any).handleAddToCart;
    };
  }, [screens, centerLat, centerLng, radiusKm]);

  // Effect para focar no screen quando focusScreen mudar
  useEffect(() => {
    if (focusScreen && mapInstanceRef.current) {
      console.log('🎯 Focando no screen:', focusScreen.display_name);
      focusOnScreen(focusScreen);
    }
  }, [focusScreen]);

  if (loading) {
  return (
    <Card className="h-full">
      <CardContent className="p-0 h-full relative">
        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Carregando mapa...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-0 h-full relative">
        
        <div 
          ref={mapRef} 
          className="w-full h-full rounded-lg"
          style={{ minHeight: '400px' }}
        />
      </CardContent>
    </Card>
  );
}