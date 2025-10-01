import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Search, Zap, ZapOff, AlertCircle, RefreshCw, MousePointer, Navigation, Loader2, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { geocodeAddress } from '@/lib/geocoding';
import { searchScreensNearLocation, ScreenSearchResult } from '@/lib/search-service';
import marcadorLocalizacao from '@/assets/marcador-de-localizacao.png';

interface Screen {
  id: number;
  code: string;
  name: string;
  city: string;
  state: string;
  class: string;
  active: boolean;
  lat: number | null;
  lng: number | null;
}

// Custom debounce hook for auto-search
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function InteractiveMap() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [filteredScreens, setFilteredScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [addressSearch, setAddressSearch] = useState('');
  const [radiusKm, setRadiusKm] = useState('5');
  const [centerCoordinates, setCenterCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [isGeocodingLoading, setIsGeocodingLoading] = useState(false);
  const [addressSearchResults, setAddressSearchResults] = useState<ScreenSearchResult[]>([]);
  const [mainSearchResults, setMainSearchResults] = useState<any[]>([]);
  
  // Debounced values for auto-search
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms delay for search
  const debouncedAddressSearch = useDebounce(addressSearch, 800); // 800ms delay for address
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  // Fetch screens data
  const fetchScreens = async () => {
    try {
      setLoading(true);
      console.log('📊 Buscando telas...');
      
      const { data, error } = await supabase
        .from('screens')
        .select('id, code, name, city, state, class, active, lat, lng')
        .order('code');

      if (error) throw error;

      console.log('✅ Telas carregadas:', data?.length || 0);
      setScreens(data || []);
      setFilteredScreens(data || []);
      
    } catch (error: any) {
      console.error('💥 Erro ao carregar telas:', error);
      toast.error(`Erro ao carregar telas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Initialize map
  const initializeMap = async () => {
    if (!mapContainer.current) return;

    try {
      console.log('🗺️ Inicializando mapa...');
      
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      if (mapInstance.current) {
        mapInstance.current.remove();
      }

      const container = mapContainer.current;
    container.style.height = '1000px';
    container.style.width = '1500px';
      container.style.maxWidth = '100%';
      container.innerHTML = '';

      const map = L.map(container).setView([-14.235, -51.925], 4);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      mapInstance.current = map;
        setMapError(null);
      console.log('✅ Mapa inicializado');

      setTimeout(() => updateMarkers(L), 500);

    } catch (error) {
      console.error('💥 Erro ao inicializar mapa:', error);
      setMapError('Erro ao carregar o mapa');
    }
  };

  // Helper functions for performance calculations
  const calculatePrice = (classType: string, durationWeeks: string): number => {
    const basePrices: Record<string, number> = { 'A': 200, 'AB': 180, 'B': 150, 'C': 120, 'D': 100, 'ND': 80 };
    const basePrice = basePrices[classType] || basePrices['ND'];
    const weeks = parseInt(durationWeeks);
    let discount = 0;
    if (weeks >= 12) discount = 0.15;
    else if (weeks >= 8) discount = 0.10;
    else if (weeks >= 4) discount = 0.05;
    return basePrice * (1 - discount);
  };

  const calculateReach = (classType: string): number => {
    const reachMap: Record<string, number> = { 'A': 2000, 'AB': 1800, 'B': 1500, 'C': 1200, 'D': 1000, 'ND': 800 };
    return reachMap[classType] || reachMap['ND'];
  };

  // Clean up function to clear address search
  const clearAddressSearch = () => {
    setCenterCoordinates(null);
    setAddressSearch('');
    setAddressSearchResults([]);
    
    // CLEAR ALL SEARCH DATA from map - Remove search markers, circles, and center markers
    if (mapInstance.current) {
      import('leaflet').then(L => {
        mapInstance.current.eachLayer((layer: any) => {
          if (layer.options && (layer.options.isSearchResult || layer.options.isRadiusCircle || layer.options.isSearchCenter)) {
            mapInstance.current.removeLayer(layer);
          }
        });
        console.log('🧹 Dados da busca anterior limpos do mapa');
      });
    }
  };

  // Auto search by address when debounced value changes
  const performAutoAddressSearch = useCallback(async (searchValue: string) => {
    if (!searchValue.trim()) {
      // Clear results when search is empty
      setAddressSearchResults([]);
      setCenterCoordinates(null);
      return;
    }

    // Only auto-search if address has reasonable length
    if (searchValue.length < 5) return;

    console.log(`🔍 Auto-busca por endereço: "${searchValue}"`);
    
    setIsGeocodingLoading(true);
    
    try {
      const geocodeResult = await geocodeAddress(searchValue);
      
      const searchResults = await searchScreensNearLocation({
        lat: geocodeResult.lat,
        lng: geocodeResult.lng,
        startDate: new Date().toISOString(),
        durationWeeks: "2",
        addressName: searchValue,
        formattedAddress: geocodeResult.google_formatted_address,
        placeId: geocodeResult.google_place_id,
        radiusKm: parseInt(radiusKm)
      });

      setCenterCoordinates({ lat: geocodeResult.lat, lng: geocodeResult.lng });
      setAddressSearchResults(searchResults);

      // Centralizar mapa na localização (sem toast para auto-search)
      if (mapInstance.current) {
        mapInstance.current.setView([geocodeResult.lat, geocodeResult.lng], 12);
        
        // Adicionar marcador do centro da busca
        const L = await import('leaflet');
        
        // Remove previous search center markers
        mapInstance.current.eachLayer((layer: any) => {
          if (layer.options && layer.options.isSearchCenter) {
            mapInstance.current.removeLayer(layer);
          }
        });
        
        const marker = L.marker([geocodeResult.lat, geocodeResult.lng], {
          icon: L.icon({
            iconUrl: marcadorLocalizacao,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
          }),
          isSearchCenter: true
        }).addTo(mapInstance.current);
        
        marker.bindPopup(`
          <div style="padding: 8px; text-align: center;">
            <h4 style="margin: 0 0 4px 0; font-weight: bold; color: #ef4444;">📍 Auto-busca</h4>
            <p style="margin: 0; font-size: 12px;">${geocodeResult.google_formatted_address || searchValue}</p>
            <p style="margin: 2px 0; font-size: 11px; color: #666;">Raio: ${radiusKm}km • ${searchResults.length} telas</p>
          </div>
        `);
        
        // CRITICAL: Update markers to show search results on map (use LP logic)
        console.log('🎯 Atualizando marcadores no mapa após auto-busca por endereço (lógica da LP)');
        
        // CLEAR PREVIOUS SEARCH DATA - Remove old search markers and circles
        mapInstance.current.eachLayer((layer: any) => {
          if (layer.options && (layer.options.isSearchResult || layer.options.isRadiusCircle)) {
            mapInstance.current.removeLayer(layer);
          }
        });
        
        // Add radius circle like LP
        const radiusCircle = L.circle([geocodeResult.lat, geocodeResult.lng], {
          color: '#3b82f6',
          fillColor: '#3b82f6', 
          fillOpacity: 0.1,
          radius: parseInt(radiusKm) * 1000, // Convert km to meters
          isRadiusCircle: true // Flag to identify radius circles
        }).addTo(mapInstance.current);
        
        // Add screen markers from search results (LP style)
        searchResults.forEach((screen) => {
          if (screen.lat && screen.lng) {
            const screenMarker = L.marker([screen.lat, screen.lng], {
              icon: L.divIcon({
                className: 'search-result-marker',
                html: `<div style="width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; background: #06b6d4;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
              }),
              isSearchResult: true // Flag to identify search result markers
            }).addTo(mapInstance.current);
            
            screenMarker.bindPopup(`
              <div style="padding: 12px; min-width: 280px; max-width: 320px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background: #06b6d4; display: flex; align-items: center; justify-content: center;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 style="font-weight: 600; color: #111827; font-size: 16px; margin: 0;">${screen.name || screen.code}</h4>
                    <p style="font-size: 12px; color: #0891b2; margin: 0;">Código: ${screen.code}</p>
                  </div>
                </div>
                
                <div style="background: #f9fafb; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                  <h5 style="font-weight: 600; color: #374151; margin: 0 0 6px 0; font-size: 12px;">📍 Localização</h5>
                  <div style="font-size: 11px; color: #374151;">
                    <div><strong>Cidade:</strong> ${screen.city}, ${screen.state}</div>
                    <div><strong>Distância:</strong> ${screen.distance}km do centro</div>
                  </div>
                </div>
                
                <div style="background: #f9fafb; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                  <h5 style="font-weight: 600; color: #374151; margin: 0 0 8px 0; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                    <span>📊</span> Performance
                  </h5>
                  <div style="font-size: 11px; color: #374151; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                    <div style="background: #e0f2fe; padding: 6px; border-radius: 4px;">
                      <div style="font-weight: 600; color: #0369a1;">Alcance</div>
                      <div style="color: #0c4a6e;">${screen.reach ? screen.reach.toLocaleString() : 'N/A'} pessoas/semana</div>
                    </div>
                    <div style="background: #f0fdf4; padding: 6px; border-radius: 4px;">
                      <div style="font-weight: 600; color: #166534;">Investimento</div>
                      <div style="color: #14532d;">R$ ${screen.price ? screen.price.toFixed(2) : 'N/A'}/semana</div>
                    </div>
                    <div style="background: #fef3c7; padding: 6px; border-radius: 4px;">
                      <div style="font-weight: 600; color: #92400e;">CPM</div>
                      <div style="color: #78350f;">R$ ${screen.reach && screen.price ? (screen.price / (screen.reach / 1000)).toFixed(2) : 'N/A'}</div>
                    </div>
                    <div style="background: #f3e8ff; padding: 6px; border-radius: 4px;">
                      <div style="font-weight: 600; color: #7c3aed;">Classe</div>
                      <div style="color: #5b21b6;">${screen.class || 'N/A'}</div>
                    </div>
                  </div>
                </div>
                
              </div>
            `);
          }
        });
        
        // Small delay to ensure all markers are added before updating existing ones
        setTimeout(() => updateMarkers(L), 200);
      }
      
    } catch (error) {
      console.error('❌ Erro na auto-busca por endereço:', error);
      // Don't show error toast for auto-search, just clear results
      setAddressSearchResults([]);
      setCenterCoordinates(null);
    } finally {
      setIsGeocodingLoading(false);
    }
  }, [radiusKm]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Search by address and radius using LP logic
  const searchByAddressAndRadius = async () => {
    if (!addressSearch.trim()) {
      toast.error('Digite um endereço para buscar');
      return;
    }

    setIsGeocodingLoading(true);
    
    try {
      console.log('🔍 Iniciando busca para:', addressSearch);
      
      // Usar a mesma função de geocoding da LP
      const geocodeResult = await geocodeAddress(addressSearch);
      
      console.log('📍 Coordenadas obtidas:', geocodeResult);
      
      // Buscar telas próximas usando o mesmo serviço da LP
      const searchResults = await searchScreensNearLocation({
        lat: geocodeResult.lat,
        lng: geocodeResult.lng,
        startDate: new Date().toISOString(),
        durationWeeks: "2",
        addressName: addressSearch,
        formattedAddress: geocodeResult.google_formatted_address,
        placeId: geocodeResult.google_place_id,
        radiusKm: parseInt(radiusKm)
      });

      console.log('✅ Busca concluída:', searchResults.length, 'telas encontradas');
      
      // Definir coordenadas do centro
      setCenterCoordinates({ lat: geocodeResult.lat, lng: geocodeResult.lng });
      setAddressSearchResults(searchResults);
      
      // Centralizar mapa na localização
      if (mapInstance.current) {
        mapInstance.current.setView([geocodeResult.lat, geocodeResult.lng], 12);
        
        // Adicionar marcador do centro da busca
        const L = await import('leaflet');
        const marker = L.marker([geocodeResult.lat, geocodeResult.lng], {
          icon: L.icon({
            iconUrl: marcadorLocalizacao,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
          }),
          isSearchCenter: true // Flag to identify search center marker
        }).addTo(mapInstance.current);
        
        marker.bindPopup(`
          <div style="padding: 8px; text-align: center;">
            <h4 style="margin: 0 0 4px 0; font-weight: bold; color: #ef4444;">📍 Centro da Busca</h4>
            <p style="margin: 0; font-size: 12px;">${geocodeResult.google_formatted_address || addressSearch}</p>
            <p style="margin: 2px 0; font-size: 11px; color: #666;">Raio: ${radiusKm} km</p>
          </div>
        `).openPopup();
        
        // CRITICAL: Update markers to show search results on map (use LP logic)
        console.log('🎯 Atualizando marcadores no mapa após busca por endereço (lógica da LP)');
        
        // CLEAR PREVIOUS SEARCH DATA - Remove old search markers and circles
        mapInstance.current.eachLayer((layer: any) => {
          if (layer.options && (layer.options.isSearchResult || layer.options.isRadiusCircle)) {
            mapInstance.current.removeLayer(layer);
          }
        });
        
        // Add radius circle like LP
        const radiusCircle = L.circle([geocodeResult.lat, geocodeResult.lng], {
          color: '#3b82f6',
          fillColor: '#3b82f6', 
          fillOpacity: 0.1,
          radius: parseInt(radiusKm) * 1000, // Convert km to meters
          isRadiusCircle: true // Flag to identify radius circles
        }).addTo(mapInstance.current);
        
        // Add screen markers from search results (LP style)
        searchResults.forEach((screen) => {
          if (screen.lat && screen.lng) {
            const screenMarker = L.marker([screen.lat, screen.lng], {
              icon: L.divIcon({
                className: 'search-result-marker',
                html: `<div style="width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; background: #06b6d4;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
              }),
              isSearchResult: true // Flag to identify search result markers
            }).addTo(mapInstance.current);
            
            screenMarker.bindPopup(`
              <div style="padding: 12px; min-width: 280px; max-width: 320px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background: #06b6d4; display: flex; align-items: center; justify-content: center;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 style="font-weight: 600; color: #111827; font-size: 16px; margin: 0;">${screen.name || screen.code}</h4>
                    <p style="font-size: 12px; color: #0891b2; margin: 0;">Código: ${screen.code}</p>
                  </div>
                </div>
                
                <div style="background: #f9fafb; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                  <h5 style="font-weight: 600; color: #374151; margin: 0 0 6px 0; font-size: 12px;">📍 Localização</h5>
                  <div style="font-size: 11px; color: #374151;">
                    <div><strong>Cidade:</strong> ${screen.city}, ${screen.state}</div>
                    <div><strong>Distância:</strong> ${screen.distance}km do centro</div>
                  </div>
                </div>
                
                <div style="background: #f9fafb; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                  <h5 style="font-weight: 600; color: #374151; margin: 0 0 8px 0; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                    <span>📊</span> Performance
                  </h5>
                  <div style="font-size: 11px; color: #374151; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                    <div style="background: #e0f2fe; padding: 6px; border-radius: 4px;">
                      <div style="font-weight: 600; color: #0369a1;">Alcance</div>
                      <div style="color: #0c4a6e;">${screen.reach ? screen.reach.toLocaleString() : 'N/A'} pessoas/semana</div>
                    </div>
                    <div style="background: #f0fdf4; padding: 6px; border-radius: 4px;">
                      <div style="font-weight: 600; color: #166534;">Investimento</div>
                      <div style="color: #14532d;">R$ ${screen.price ? screen.price.toFixed(2) : 'N/A'}/semana</div>
                    </div>
                    <div style="background: #fef3c7; padding: 6px; border-radius: 4px;">
                      <div style="font-weight: 600; color: #92400e;">CPM</div>
                      <div style="color: #78350f;">R$ ${screen.reach && screen.price ? (screen.price / (screen.reach / 1000)).toFixed(2) : 'N/A'}</div>
                    </div>
                    <div style="background: #f3e8ff; padding: 6px; border-radius: 4px;">
                      <div style="font-weight: 600; color: #7c3aed;">Classe</div>
                      <div style="color: #5b21b6;">${screen.class || 'N/A'}</div>
                    </div>
                  </div>
                </div>
                
              </div>
            `);
          }
        });
        
        // Small delay to ensure all markers are added before updating existing ones
        setTimeout(() => updateMarkers(L), 200);
      }
      
      toast.success(`${searchResults.length} telas encontradas em um raio de ${radiusKm}km`);
      
    } catch (error) {
      console.error('❌ Erro na busca:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar telas');
      
      // Limpar resultados em caso de erro
      setAddressSearchResults([]);
      setCenterCoordinates(null);
    } finally {
      setIsGeocodingLoading(false);
    }
  };

  // Navigate to specific screen on map using real coordinates from database
  const navigateToScreen = async (screen: Screen) => {
    if (!mapInstance.current || !screen.lat || !screen.lng) {
      toast.error('Coordenadas não disponíveis para esta tela');
      return;
    }

    const lat = Number(screen.lat);
    const lng = Number(screen.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Coordenadas inválidas para esta tela');
      return;
    }

    console.log(`🎯 Navegando para tela ${screen.code} em [${lat}, ${lng}]`);
    
    // Show loading toast
    toast.success(`📍 Navegando para ${screen.code} - ${screen.city}`);

    // Set view to screen location with higher zoom (real coordinates from database)
    mapInstance.current.setView([lat, lng], 16);

    // Import L and find popup for this screen
    const L = await import('leaflet');
    let popupFound = false;
    
    mapInstance.current.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) {
        const layerLatLng = layer.getLatLng();
        // Use precise coordinate matching for database coordinates
        if (Math.abs(layerLatLng.lat - lat) < 0.0001 && Math.abs(layerLatLng.lng - lng) < 0.0001) {
        setTimeout(() => {
            layer.openPopup();
            popupFound = true;
          }, 300);
        }
      }
    });

    // If no popup found after delay, show info toast
        setTimeout(() => {
      if (!popupFound) {
        console.log('⚠️ Popup não encontrado, mas coordenadas são do banco de dados');
      }
    }, 500);
  };

  const updateMarkers = async (L: any) => {
    if (!mapInstance.current) return;

    console.log('🔄 updateMarkers called:', {
      screensTotal: screens.length,
      addressSearchResults: addressSearchResults.length,
      hasMap: !!mapInstance.current
    });

    const map = mapInstance.current;
    
    // Clear existing markers except search center marker and search result markers
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker && !layer.options.isSearchCenter && !layer.options.isSearchResult && !layer.options.isMainSearchResult) {
        map.removeLayer(layer);
      }
    });

    // Always show ALL screens from database (all 1000 screens)
    const validScreens = screens
      .filter(s => s.lat && s.lng); // Show ALL screens without limit
    
    console.log('🎯 Telas válidas para mostrar no mapa:', validScreens.length);

    const markers: any[] = [];

    validScreens.forEach(screen => {
      const lat = Number(screen.lat);
      const lng = Number(screen.lng);
      
      if (isNaN(lat) || isNaN(lng)) return;

      // Use heart icon with cyan background for all screens (search results have separate markers)
      let backgroundColor = screen.active ? '#06b6d4' : '#6b7280'; // Cyan for active, gray for inactive
      let size = 20; // Slightly larger for heart icon

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; background: ${backgroundColor};">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);
      
      // Calculate performance data for popup
      const price = calculatePrice(screen.class || 'ND', '2');
      const reach = calculateReach(screen.class || 'ND');
      const cpm = reach && price ? (price / (reach / 1000)).toFixed(2) : 'N/A';

      marker.bindPopup(`
        <div style="padding: 12px; min-width: 280px; max-width: 320px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${backgroundColor}; display: flex; align-items: center; justify-content: center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <div>
              <h4 style="font-weight: 600; color: #111827; font-size: 16px; margin: 0;">${screen.name || screen.code}</h4>
              <p style="font-size: 12px; color: #0891b2; margin: 0;">Código: ${screen.code}</p>
            </div>
          </div>

          <div style="background: #f9fafb; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
            <h5 style="font-weight: 600; color: #374151; margin: 0 0 6px 0; font-size: 12px;">📍 Localização</h5>
            <div style="font-size: 11px; color: #374151;">
              <div><strong>Cidade:</strong> ${screen.city}, ${screen.state}</div>
              <div><strong>Status:</strong> ${screen.active ? '🟢 Ativa' : '🔴 Inativa'}</div>
            </div>
          </div>

          <div style="background: #f9fafb; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
            <h5 style="font-weight: 600; color: #374151; margin: 0 0 8px 0; font-size: 12px; display: flex; align-items: center; gap: 4px;">
              <span>📊</span> Performance
            </h5>
            <div style="font-size: 11px; color: #374151; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <div style="background: #e0f2fe; padding: 6px; border-radius: 4px;">
                <div style="font-weight: 600; color: #0369a1;">Alcance</div>
                <div style="color: #0c4a6e;">${reach.toLocaleString()} pessoas/semana</div>
            </div>
              <div style="background: #f0fdf4; padding: 6px; border-radius: 4px;">
                <div style="font-weight: 600; color: #166534;">Investimento</div>
                <div style="color: #14532d;">R$ ${price.toFixed(2)}/semana</div>
            </div>
              <div style="background: #fef3c7; padding: 6px; border-radius: 4px;">
                <div style="font-weight: 600; color: #92400e;">CPM</div>
                <div style="color: #78350f;">R$ ${cpm}</div>
            </div>
              <div style="background: #f3e8ff; padding: 6px; border-radius: 4px;">
                <div style="font-weight: 600; color: #7c3aed;">Classe</div>
                <div style="color: #5b21b6;">${screen.class || 'N/A'}</div>
          </div>
            </div>
          </div>
        </div>
      `);

      markers.push(marker);
    });

    // Only fit bounds if no search is active (to preserve search center view)
    if (!centerCoordinates && markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    console.log('✅ Marcadores adicionados ao mapa:', {
      total: markers.length,
      searchResultsCount: addressSearchResults.length,
      searchActive: addressSearchResults.length > 0
    });
  };

  // Apply filters with performance data
  const applyFilters = () => {
    let filtered = screens;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      
      // Special handling for code search - find ALL screens with matching code (including variations)
      const targetScreens = screens.filter(s => {
        const screenCode = s.code.toLowerCase();
        const searchTerm = term.toLowerCase();
        
        // Exact match or starts with the search term (for variations like P2007.1, P2007.20)
        return screenCode === searchTerm || screenCode.startsWith(searchTerm + '.');
      });
      
      if (targetScreens.length > 0) {
        console.log(`🎯 Busca por código "${term}" - ${targetScreens.length} telas encontradas:`, targetScreens.map(s => `${s.name} (${s.code})`));
        
        // Calculate distance from any target screen to all other screens
        const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
          const R = 6371; // Earth's radius in kilometers
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          return distance;
        };
        
        // Show only the exact screens found (no radius search)
        filtered = targetScreens;
        
        console.log(`📍 ${filtered.length} telas encontradas com código ${term}`);
        
        // Center map on first target screen and add visual indicators
        if (mapInstance.current) {
          import('leaflet').then(L => {
            // Clear previous search markers
            mapInstance.current.eachLayer((layer: any) => {
              if (layer.options && (layer.options.isSearchCenter || layer.options.isMainSearchResult)) {
                mapInstance.current.removeLayer(layer);
              }
            });
            
            const firstTargetScreen = targetScreens[0];
            mapInstance.current.setView([firstTargetScreen.lat!, firstTargetScreen.lng!], 12);
            
            // Add markers for ALL target screens with performance data
            const filteredWithPerformance = targetScreens.map(screen => ({
              ...screen,
              price: calculatePrice(screen.class || 'ND', '2'), // Default 2 weeks
              reach: calculateReach(screen.class || 'ND'),
              distance: 0 // Not applicable for code search
            }));
            
            filteredWithPerformance.forEach((screen, index) => {
              if (screen.lat && screen.lng) {
                const screenMarker = L.marker([screen.lat, screen.lng], {
                  icon: L.divIcon({
                    className: 'main-search-result-marker',
                    html: `<div style="width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; background: #06b6d4;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                  }),
                  isMainSearchResult: true // Flag to identify main search result markers
                }).addTo(mapInstance.current);
                
                // Bind popup with performance data
                const price = calculatePrice(screen.class || 'ND', '2');
                const reach = calculateReach(screen.class || 'ND');
                const cpm = reach && price ? (price / (reach / 1000)).toFixed(2) : 'N/A';
                
                screenMarker.bindPopup(`
                  <div style="padding: 12px; min-width: 280px; max-width: 320px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                      <div style="width: 32px; height: 32px; border-radius: 50%; background: #06b6d4; display: flex; align-items: center; justify-content: center;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 style="font-weight: 600; color: #111827; font-size: 16px; margin: 0;">${screen.name || screen.code}</h4>
                        <p style="font-size: 12px; color: #0891b2; margin: 0;">Código: ${screen.code}</p>
                      </div>
                    </div>
                    
                    <div style="background: #f9fafb; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                      <h5 style="font-weight: 600; color: #374151; margin: 0 0 8px 0; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                        <span>📊</span> Performance
                      </h5>
                      <div style="font-size: 11px; color: #374151; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                        <div style="background: #e0f2fe; padding: 6px; border-radius: 4px;">
                          <div style="font-weight: 600; color: #0369a1;">Alcance</div>
                          <div style="color: #0c4a6e;">${reach.toLocaleString()} pessoas/semana</div>
                        </div>
                        <div style="background: #f0fdf4; padding: 6px; border-radius: 4px;">
                          <div style="font-weight: 600; color: #166534;">Investimento</div>
                          <div style="color: #14532d;">R$ ${price.toFixed(2)}/semana</div>
                        </div>
                        <div style="background: #fef3c7; padding: 6px; border-radius: 4px;">
                          <div style="font-weight: 600; color: #92400e;">CPM</div>
                          <div style="color: #78350f;">R$ ${cpm}</div>
                        </div>
                        <div style="background: #f3e8ff; padding: 6px; border-radius: 4px;">
                          <div style="font-weight: 600; color: #7c3aed;">Classe</div>
                          <div style="color: #5b21b6;">${screen.class || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div style="font-size: 12px; color: #374151; margin-bottom: 8px;">
                      <div style="margin-bottom: 4px;"><strong>Localização:</strong> ${screen.city}, ${screen.state}</div>
                      <div style="margin-bottom: 4px;"><strong>Status:</strong> ${screen.active ? 'Ativa' : 'Inativa'}</div>
                    </div>
                  </div>
                `);
                
                // Open popup only for the first screen
                if (index === 0) {
                  screenMarker.openPopup();
                }
              }
            });
          });
        }
      } else {
        // Fallback to regular search if no exact code match
        filtered = filtered.filter(s => 
          s.code.toLowerCase().includes(term) ||
          s.name.toLowerCase().includes(term) ||
          s.city.toLowerCase().includes(term)
        );
      }
    }

    if (cityFilter !== 'all') {
      filtered = filtered.filter(s => s.city === cityFilter);
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter(s => s.active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(s => !s.active);
    }

    if (classFilter !== 'all') {
      filtered = filtered.filter(s => s.class === classFilter);
    }

    // Apply radius filter if center coordinates are set
    if (centerCoordinates) {
      const radius = parseFloat(radiusKm);
      filtered = filtered.filter(screen => {
        if (!screen.lat || !screen.lng) return false;
        
        const distance = calculateDistance(
          centerCoordinates.lat,
          centerCoordinates.lng,
          Number(screen.lat),
          Number(screen.lng)
        );
        
        return distance <= radius;
      });
    }

    // Add performance data to filtered results
    const filteredWithPerformance = filtered.map(screen => ({
      ...screen,
      price: calculatePrice(screen.class || 'ND', '2'), // Default 2 weeks
      reach: calculateReach(screen.class || 'ND'),
      distance: 0 // Not applicable for main search
    }));
    
    setFilteredScreens(filtered);
    setMainSearchResults(filteredWithPerformance);
    
    // Add special markers to map for filtered results (like address search but without radius)
    if (mapInstance.current && (searchTerm || cityFilter !== 'all' || statusFilter !== 'all' || classFilter !== 'all')) {
      import('leaflet').then(L => {
        // Clear previous main search markers
        mapInstance.current.eachLayer((layer: any) => {
          if (layer.options && layer.options.isMainSearchResult) {
            mapInstance.current.removeLayer(layer);
          }
        });
        
        // Add markers for filtered results
        filteredWithPerformance.forEach((screen) => {
          if (screen.lat && screen.lng) {
            const screenMarker = L.marker([screen.lat, screen.lng], {
              icon: L.divIcon({
                className: 'main-search-result-marker',
                html: `<div style="width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; background: #06b6d4;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
              }),
              isMainSearchResult: true // Flag to identify main search result markers
            }).addTo(mapInstance.current);
            
            screenMarker.bindPopup(`
              <div style="padding: 12px; min-width: 280px; max-width: 320px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background: #06b6d4; display: flex; align-items: center; justify-content: center;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 style="font-weight: 600; color: #111827; font-size: 16px; margin: 0;">${screen.name || screen.code}</h4>
                    <p style="font-size: 12px; color: #0891b2; margin: 0;">Código: ${screen.code}</p>
                  </div>
                </div>
                
                <div style="background: #f9fafb; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                  <h5 style="font-weight: 600; color: #374151; margin: 0 0 6px 0; font-size: 12px;">📍 Localização</h5>
                  <div style="font-size: 11px; color: #374151;">
                    <div><strong>Cidade:</strong> ${screen.city}, ${screen.state}</div>
                    <div><strong>Status:</strong> ${screen.active ? '🟢 Ativa' : '🔴 Inativa'}</div>
                  </div>
                </div>
                
                <div style="background: #f9fafb; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                  <h5 style="font-weight: 600; color: #374151; margin: 0 0 8px 0; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                    <span>📊</span> Performance
                  </h5>
                  <div style="font-size: 11px; color: #374151; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                    <div style="background: #e0f2fe; padding: 6px; border-radius: 4px;">
                      <div style="font-weight: 600; color: #0369a1;">Alcance</div>
                      <div style="color: #0c4a6e;">${screen.reach ? screen.reach.toLocaleString() : 'N/A'} pessoas/semana</div>
                    </div>
                    <div style="background: #f0fdf4; padding: 6px; border-radius: 4px;">
                      <div style="font-weight: 600; color: #166534;">Investimento</div>
                      <div style="color: #14532d;">R$ ${screen.price ? screen.price.toFixed(2) : 'N/A'}/semana</div>
                    </div>
                    <div style="background: #fef3c7; padding: 6px; border-radius: 4px;">
                      <div style="font-weight: 600; color: #92400e;">CPM</div>
                      <div style="color: #78350f;">R$ ${screen.reach && screen.price ? (screen.price / (screen.reach / 1000)).toFixed(2) : 'N/A'}</div>
                    </div>
                    <div style="background: #f3e8ff; padding: 6px; border-radius: 4px;">
                      <div style="font-weight: 600; color: #7c3aed;">Classe</div>
                      <div style="color: #5b21b6;">${screen.class || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>
            `);
          }
        });
        
        console.log('🎯 Marcadores de busca principal adicionados ao mapa:', filteredWithPerformance.length);
      });
    }
  };

  // Effects
  useEffect(() => {
    fetchScreens();
  }, []);

  useEffect(() => {
    if (screens.length > 0) {
      initializeMap();
    }
  }, [screens]);

  useEffect(() => {
    applyFilters();
  }, [screens, searchTerm, cityFilter, statusFilter, classFilter, centerCoordinates, radiusKm]);

  useEffect(() => {
    if (mapInstance.current && screens.length > 0) {
      import('leaflet').then(L => updateMarkers(L));
    }
  }, [screens, addressSearchResults]);

  // Auto-search for regular search field
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return; // Only trigger when debounce is settled
    console.log(`🔍 Auto-busca por termo: "${debouncedSearchTerm}"`);
    // The search is handled by applyFilters which runs when searchTerm changes
    applyFilters();
  }, [debouncedSearchTerm]);

  // Função para executar busca manual instantânea
  const performInstantSearch = () => {
    console.log('⚡ Busca instantânea por ENTER:', searchTerm);
    applyFilters();
    
    // Show toast with results count after filters are applied
        setTimeout(() => {
      // Force re-apply filters to get updated count
      let filtered = screens;
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(screen =>
          screen.code.toLowerCase().includes(searchLower) ||
          screen.name.toLowerCase().includes(searchLower)
        );
      }
      
      if (cityFilter !== 'all') {
        filtered = filtered.filter(screen => screen.city === cityFilter);
      }
      
      if (statusFilter !== 'all') {
        const isActive = statusFilter === 'active';
        filtered = filtered.filter(screen => screen.active === isActive);
      }
      
      if (classFilter !== 'all') {
        filtered = filtered.filter(screen => screen.class === classFilter);
      }
      
      const count = filtered.length;
      if (searchTerm) {
        toast.success(`🎯 ${count} tela${count !== 1 ? 's' : ''} encontrada${count !== 1 ? 's' : ''} para "${searchTerm}"`);
    } else {
        toast.info(`📋 Mostrando todas as ${count} telas disponíveis`);
      }
      
      // Scroll to results in sidebar if any found
      if (count > 0) {
        const sidebar = document.querySelector('[data-sidebar="results"]');
        if (sidebar) {
          sidebar.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 150);
  };

  // Clean up function to clear main search
  const clearMainSearch = () => {
    setSearchTerm('');
    setCityFilter('all');
    setStatusFilter('all');
    setClassFilter('all');
    setMainSearchResults([]);
    
    // Clear main search markers from map (including code search markers)
    if (mapInstance.current) {
      import('leaflet').then(L => {
        mapInstance.current.eachLayer((layer: any) => {
          if (layer.options && (layer.options.isMainSearchResult || layer.options.isSearchCenter)) {
            mapInstance.current.removeLayer(layer);
          }
        });
        console.log('🧹 Marcadores de busca principal limpos do mapa (incluindo busca por código)');
      });
    }
    
    applyFilters();
  };

  // Auto-search for address field  
  useEffect(() => {
    if (debouncedAddressSearch !== addressSearch) return; // Only trigger when debounce is settled
    performAutoAddressSearch(debouncedAddressSearch);
  }, [debouncedAddressSearch, performAutoAddressSearch]);

  // Get unique values
  const cities = Array.from(new Set(screens.map(s => s.city))).sort();
  const classes = Array.from(new Set(screens.map(s => s.class))).sort();

    const stats = {
    total: screens.length,
    active: screens.filter(s => s.active).length,
    visible: filteredScreens.length,
    cities: cities.length
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
                <div>
            <h1 className="text-2xl font-bold">Mapa Interativo</h1>
            <p className="text-muted-foreground">Visualize a rede de telas</p>
                </div>
          <Button onClick={fetchScreens} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
                  </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total de Telas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              </CardContent>
            </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Telas Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              </CardContent>
            </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Visíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.visible}</div>
              </CardContent>
            </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cidades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.cities}</div>
              </CardContent>
            </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Address and Radius Search */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Busca por Endereço e Raio
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Localização
                  </label>
                  <Input
                    placeholder="Ex: Av Paulista, 1000, São Paulo (ENTER para buscar)"
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        console.log('🔍 Busca por endereço via ENTER:', addressSearch);
                        searchByAddressAndRadius();
                      }
                    }}
                  />
                  </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-800 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Raio de Busca
                  </label>
              <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-blue-600">km</span>
                </div>
          </div>
              </div>
              <div className="mt-4 flex gap-2">
                  <Button
                  onClick={searchByAddressAndRadius}
                  disabled={isGeocodingLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {isGeocodingLoading ? "Buscando..." : (
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Buscar Telas Disponíveis
                  </div>
                )}
                  </Button>
                {centerCoordinates && (
                  <Button
                    variant="outline"
                    onClick={clearAddressSearch}
                  >
                    Limpar Busca
                  </Button>
                )}
                </div>
              {centerCoordinates && (
                <div className="mt-2 text-sm text-blue-700">
                  📍 {addressSearchResults.length} telas encontradas em um raio de {radiusKm}km
              </div>
              )}
              
              
              <div className="mt-3 text-xs text-blue-600">
                💡 <strong>Dica:</strong> Digite endereços completos como "Av. Paulista, 1000, São Paulo" para melhores resultados
                  </div>
                </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                    placeholder="Ex: p2007 (busca por código exato)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          performInstantSearch();
                        }
                      }}
                    className="pl-10"
                    />
                  </div>
                </div>
              <div>
                <label className="text-sm font-medium">Cidade</label>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                      {cities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="inactive">Inativas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              <div>
                <label className="text-sm font-medium">Classe</label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger>
                    <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                      {classes.map(cls => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                </div>
            <div className="mt-4">
                  <Button 
                onClick={clearMainSearch}
                variant="outline" 
                    size="sm" 
              >
                Limpar Filtros
                  </Button>
              </div>
            </CardContent>
          </Card>

                {/* Map */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
          <div className="lg:col-span-7">
            <Card>
              <CardHeader>
                <CardTitle>Mapa das Telas</CardTitle>
                    </CardHeader>
              <CardContent className="p-0">
                      {mapError ? (
                  <Alert className="m-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{mapError}</AlertDescription>
                  </Alert>
                ) : (
                  <div ref={mapContainer} className="w-full h-[1000px] max-w-[1500px] rounded-lg overflow-auto" />
                      )}
                    </CardContent>
                  </Card>
                </div>

          <div className="lg:col-span-3" data-sidebar="results">
                  <Card>
                    <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MousePointer className="h-4 w-4" />
                  {addressSearchResults.length > 0 ? 'Resultados da Busca' : 
                   (searchTerm || cityFilter !== 'all' || statusFilter !== 'all' || classFilter !== 'all') ? 'Resultados dos Filtros' : 'Telas Próximas'}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {addressSearchResults.length > 0 
                    ? `${addressSearchResults.length} telas encontradas na busca`
                    : (searchTerm || cityFilter !== 'all' || statusFilter !== 'all' || classFilter !== 'all')
                    ? `${mainSearchResults.length} telas encontradas nos filtros`
                    : 'Clique em uma tela para visualizá-la no mapa'
                  }
                </p>
                    </CardHeader>
              <CardContent>
                {/* Show search results when available */}
                {addressSearchResults.length > 0 ? (
                  <div className="space-y-3 max-h-[950px] overflow-y-auto">
                    {addressSearchResults.map((screen) => (
                      <Card key={screen.id} className="p-3 hover:shadow-md transition-shadow">
                        <div 
                          className="font-medium cursor-pointer hover:text-blue-600 hover:underline transition-colors mb-2 text-sm"
                          onClick={() => {
                            // Use existing navigation function with popup
                            const screenData = {
                              id: screen.id,
                              code: screen.code,
                              name: screen.name,
                              lat: screen.lat,
                              lng: screen.lng,
                              city: screen.city,
                              state: screen.state,
                              class: screen.class || 'ND',
                              active: true
                            };
                            navigateToScreen(screenData);
                          }}
                          title="Clique para focar no mapa"
                        >
                          {screen.name || screen.code}
                              </div>
                        
                        <div className="text-xs text-muted-foreground mb-2">
                          {screen.city}, {screen.state} • {screen.distance}km
                            </div>

                        {/* Dados de Performance */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="bg-blue-50 p-2 rounded text-xs">
                            <div className="font-medium text-blue-800">Alcance</div>
                            <div className="text-blue-600">
                              {screen.reach ? screen.reach.toLocaleString() : 'N/A'} pessoas/semana
                            </div>
                          </div>
                          <div className="bg-green-50 p-2 rounded text-xs">
                            <div className="font-medium text-green-800">Investimento</div>
                            <div className="text-green-600">R$ {screen.price ? screen.price.toFixed(2) : 'N/A'}/semana</div>
                        </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="bg-yellow-50 p-2 rounded text-xs">
                            <div className="font-medium text-yellow-800">CPM</div>
                            <div className="text-yellow-600">
                              R$ {screen.reach && screen.price ? (screen.price / (screen.reach / 1000)).toFixed(2) : 'N/A'}
                        </div>
                </div>
                          <div className="bg-purple-50 p-2 rounded text-xs">
                            <div className="font-medium text-purple-800">Classe</div>
                            <div className="text-purple-600">{screen.class}</div>
              </div>
              </div>

      </Card>
                    ))}
                  </div>
                ) : (searchTerm || cityFilter !== 'all' || statusFilter !== 'all' || classFilter !== 'all') ? (
                  // Show main search results with performance data
                  <div className="space-y-3 max-h-[950px] overflow-y-auto">
                    {mainSearchResults.map((screen) => (
                      <Card key={screen.id} className="p-3 hover:shadow-md transition-shadow">
                        <div 
                          className="font-medium cursor-pointer hover:text-blue-600 hover:underline transition-colors mb-2 text-sm"
                          onClick={() => {
                            const screenData = {
                              id: screen.id,
                              code: screen.code,
                              name: screen.name,
                              lat: screen.lat,
                              lng: screen.lng,
                              city: screen.city,
                              state: screen.state,
                              class: screen.class || 'ND',
                              active: screen.active
                            };
                            navigateToScreen(screenData);
                          }}
                          title="Clique para focar no mapa"
                        >
                          {screen.name || screen.code}
        </div>
                        
                        <div className="text-xs text-muted-foreground mb-2">
                          {screen.city}, {screen.state}
      </div>

                        {/* Dados de Performance */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="bg-blue-50 p-2 rounded text-xs">
                            <div className="font-medium text-blue-800">Alcance</div>
                            <div className="text-blue-600">
                              {screen.reach ? screen.reach.toLocaleString() : 'N/A'} pessoas/semana
              </div>
            </div>
                          <div className="bg-green-50 p-2 rounded text-xs">
                            <div className="font-medium text-green-800">Investimento</div>
                            <div className="text-green-600">R$ {screen.price ? screen.price.toFixed(2) : 'N/A'}/semana</div>
          </div>
            </div>

                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="bg-yellow-50 p-2 rounded text-xs">
                            <div className="font-medium text-yellow-800">CPM</div>
                            <div className="text-yellow-600">
                              R$ {screen.reach && screen.price ? (screen.price / (screen.reach / 1000)).toFixed(2) : 'N/A'}
          </div>
                          </div>
                          <div className="bg-purple-50 p-2 rounded text-xs">
                            <div className="font-medium text-purple-800">Classe</div>
                            <div className="text-purple-600">{screen.class}</div>
                          </div>
                        </div>
      </Card>
                    ))}
                  </div>
                ) : (
                  // Show regular filtered screens when no search
                  <div className="space-y-2 max-h-[950px] overflow-y-auto">
                    {filteredScreens.slice(0, 15).map(screen => (
                      <div 
                        key={screen.id} 
                        className="p-2 border rounded hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigateToScreen(screen)}
                        title={`Clique para ver ${screen.code} no mapa`}
                      >
        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{screen.code}</p>
                            <p className="text-xs text-muted-foreground">{screen.city}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">{screen.class}</Badge>
              {screen.active ? (
                              <Zap className="h-3 w-3 text-green-600" />
              ) : (
                              <ZapOff className="h-3 w-3 text-gray-400" />
              )}
            </div>
              </div>
            </div>
                    ))}
          </div>
                )}
              </CardContent>
            </Card>
        </div>
      </div>
      </div>
    </DashboardLayout>
    );
  }