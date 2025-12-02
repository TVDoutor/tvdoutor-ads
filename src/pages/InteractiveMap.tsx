// @ts-nocheck
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Search, Zap, ZapOff, AlertCircle, RefreshCw, MousePointer, Navigation, Loader2, Target, Layers, Flame, FileSpreadsheet, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { geocodeAddress } from '@/lib/geocoding';
import { searchScreensNearLocation, ScreenSearchResult } from '@/lib/search-service';
import marcadorLocalizacao from '@/assets/marcador-de-localizacao.png';
import { fetchFarmacias, fetchDistinctUFs, fetchFarmaciasPorRaio, pullFarmaciasFromView, updateMissingCoordinates, updateCoordinatesFromCEP, type FarmaciaPublica } from '@/lib/pharmacy-service';

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
  proposal_count?: number;
  heat_intensity?: number;
}

const PHARMACY_LIST_LIMIT = 100;

// Sanitização simples para uso em strings HTML
const sanitize = (value: unknown): string => {
  const str = String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

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
  const [viewMode, setViewMode] = useState<'markers' | 'heatmap'>('markers');
  const [layerMode, setLayerMode] = useState<'venues' | 'pharmacies' | 'both'>('venues');
  const [heatmapData, setHeatmapData] = useState<[number, number, number][]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [pharmacies, setPharmacies] = useState<FarmaciaPublica[]>([]);
  const [ufOptions, setUfOptions] = useState<string[]>(['all']);
  const [phSearch, setPhSearch] = useState('');
  const [phFilters, setPhFilters] = useState<{ uf: string; cidade: string; grupo: string; bairro: string }>({ uf: 'all', cidade: 'all', grupo: 'all', bairro: 'all' });
  const [pharmaciesError, setPharmaciesError] = useState<string | null>(null);
  const [phStats, setPhStats] = useState<{ total: number; valid: number; rendered: number }>({ total: 0, valid: 0, rendered: 0 });
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
  const leafletRef = useRef<any>(null);
  const pharmacyMarkersRef = useRef<Map<number, any>>(new Map());
  const markerRefreshTimeout = useRef<number | null>(null);

  // Fetch screens data
  const fetchScreens = async () => {
    try {
      setLoading(true);
      console.log('📊 Buscando telas...');
      
      // Buscar telas com dados de propostas para calcular calor
      const { data, error } = await supabase
        .from('screens')
        .select(`
          id, code, name, city, state, class, active, lat, lng,
          proposal_screens(count)
        `)
        .order('code');

      if (error) throw error;

      if (data) {
        // Calcular intensidade de calor baseada no número de propostas
        const screensWithHeat = data.map(screen => {
          const proposalCount = screen.proposal_screens?.[0]?.count || 0;
          // Normalizar intensidade (0-1) baseada no número de propostas
          const maxProposals = Math.max(...data.map(s => s.proposal_screens?.[0]?.count || 0));
          const heatIntensity = maxProposals > 0 ? proposalCount / maxProposals : 0;
          
          return {
            ...screen,
            proposal_count: proposalCount,
            heat_intensity: heatIntensity
          };
        });

        setScreens(screensWithHeat);
        setFilteredScreens(screensWithHeat);
        
        // Preparar dados para heatmap - apenas telas com coordenadas válidas
        const heatData: [number, number, number][] = screensWithHeat
          .filter(screen => screen.lat !== null && screen.lng !== null)
          .map(screen => [
            screen.lat!,
            screen.lng!,
            screen.heat_intensity || 0
          ]);
        setHeatmapData(heatData);
        
        console.log(`✅ ${screensWithHeat.length} telas carregadas com dados de calor (${heatData.length} com coordenadas válidas)`);
      }
      
    } catch (error: any) {
      console.error('💥 Erro ao carregar telas:', error);
      toast.error(`Erro ao carregar telas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPharmacies = async () => {
    try {
      let rows: FarmaciaPublica[]
      if (centerCoordinates) {
        rows = await fetchFarmaciasPorRaio(centerCoordinates.lat, centerCoordinates.lng, parseFloat(radiusKm), phFilters)
      } else {
        rows = await fetchFarmacias({ filters: phFilters })
      }
      setPharmacies(rows)
      try {
        const ufs = await fetchDistinctUFs()
        setUfOptions(['all', ...ufs])
      } catch {}
      setPharmaciesError(null)
    } catch (error: any) {
      const msg = `Erro ao carregar farmácias: ${error.message}`
      setPharmaciesError(msg)
      toast.error(msg)
    }
  }

  const pullAndFetchFarmacias = async () => {
    try {
      const result = await pullFarmaciasFromView()
      toast.success(`Farmácias atualizadas: ${result.upserted} registros`)
    } catch (e: any) {
      toast.error(`Falha ao atualizar farmácias: ${e.message || 'erro'}`)
    } finally {
      await fetchPharmacies()
    }
  }

  // Initialize map
  const initializeMap = async () => {
    if (!mapContainer.current) return;

    try {
      console.log('🗺️ Inicializando mapa...');
      
      const L = await import('leaflet');
      leafletRef.current = L;
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
      if (!container) {
        setMapError('Contêiner do mapa não encontrado');
        return;
      }

      const map = L.map(container).setView([-14.235, -51.925], 4);

      try {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          crossOrigin: true,
        }).addTo(map);
      } catch (e) {
        console.warn('⚠️ Falha ao carregar tile layer OSM, prosseguindo sem base:', e);
      }

      mapInstance.current = map;
      setMapError(null);
      console.log('✅ Mapa inicializado');

      // Aguardar o mapa estar totalmente pronto antes de adicionar marcadores
      map.whenReady(() => {
        console.log('✅ Mapa pronto para adicionar marcadores');
        setTimeout(() => {
          map.invalidateSize(true);
          updateMarkers(L);
        }, 300);
      });

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
      import('leaflet').then(() => {
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
      if (!mapInstance.current) {
        console.warn('⚠️ Mapa não está inicializado');
        return;
      }
      
      const map = mapInstance.current;
      
      // Verificar se o mapa está pronto antes de operar
      if (!isMapReady(map)) {
        // Aguardar o mapa estar pronto
        map.whenReady(() => {
          try {
            if (isMapReady(map)) {
              map.setView([geocodeResult.lat, geocodeResult.lng], 12);
              addSearchCenterMarker(map, geocodeResult, addressSearch, radiusKm);
            }
          } catch (error) {
            console.error('❌ Erro ao centralizar mapa após whenReady:', error);
          }
        });
        return;
      }
      
      try {
        map.setView([geocodeResult.lat, geocodeResult.lng], 12);
        
        // Remove previous search center markers
        map.eachLayer((layer: any) => {
          if (layer.options && layer.options.isSearchCenter) {
            map.removeLayer(layer);
          }
        });
        
        await addSearchCenterMarker(map, geocodeResult, searchValue, radiusKm);
        
        // CRITICAL: Update markers to show search results on map (use LP logic)
        console.log('🎯 Atualizando marcadores no mapa após auto-busca por endereço (lógica da LP)');
        
        // CLEAR PREVIOUS SEARCH DATA - Remove old search markers and circles
        if (isMapReady(map)) {
          const L = await import('leaflet');
          
          map.eachLayer((layer: any) => {
            if (layer.options && (layer.options.isSearchResult || layer.options.isRadiusCircle)) {
              map.removeLayer(layer);
            }
          });
          
          // Add radius circle like LP
          try {
            const radiusCircle = L.circle([geocodeResult.lat, geocodeResult.lng], {
              color: '#3b82f6',
              fillColor: '#3b82f6', 
              fillOpacity: 0.1,
              radius: parseInt(radiusKm) * 1000, // Convert km to meters
              isRadiusCircle: true // Flag to identify radius circles
            });
            radiusCircle.addTo(map);
          } catch (circleError) {
            console.error('❌ Erro ao adicionar círculo de raio:', circleError);
          }
          
          // Add screen markers from search results (LP style)
          searchResults.forEach((screen) => {
            if (screen.lat && screen.lng && isMapReady(map)) {
              try {
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
                });
                
                try {
                  screenMarker.addTo(map);
                  
                  screenMarker.bindPopup(`
                    <div style="padding: 12px; min-width: 280px; max-width: 320px;">
                      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #06b6d4; display: flex; align-items: center; justify-content: center;">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                        </div>
                        <div>
                          ${screen.name ? '<h4 style="font-weight: 700; color: #111827; font-size: 16px; margin: 0 0 4px 0;">' + sanitize(screen.name) + '</h4>' : ''}
                          ${screen.code ? '<p style="font-size: 12px; color: #0891b2; margin: 0;">Código: ' + sanitize(screen.code) + '</p>' : '<p style="font-size: 12px; color: #6b7280; margin: 0;">Sem código</p>'}
                        </div>
                      </div>
                      
                      <div style="background: #f9fafb; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                        <h5 style="font-weight: 600; color: #374151; margin: 0 0 6px 0; font-size: 12px;">📍 Localização</h5>
                        <div style="font-size: 11px; color: #374151;">
                          <div><strong>Cidade:</strong> ${sanitize(screen.city)}, ${sanitize(screen.state)}</div>
                          <div><strong>Distância:</strong> ${sanitize(screen.distance)}km do centro</div>
                        </div>
                      </div>
                      
                      <div style="background: #f9fafb; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                        <h5 style="font-weight: 600; color: #374151; margin: 0 0 8px 0; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                          <span>📊</span> Performance
                        </h5>
                        <div style="font-size: 11px; color: #374151; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                          <div style="background: #e0f2fe; padding: 6px; border-radius: 4px;">
                            <div style="font-weight: 600; color: #0369a1;">Alcance</div>
                            <div style="color: #0c4a6e;">${sanitize(screen.reach ? screen.reach.toLocaleString() : 'N/A')} pessoas/semana</div>
                          </div>
                          <div style="background: #f0fdf4; padding: 6px; border-radius: 4px;">
                            <div style="font-weight: 600; color: #166534;">Investimento</div>
                            <div style="color: #14532d;">R$ ${sanitize(screen.price ? screen.price.toFixed(2) : 'N/A')}/semana</div>
                          </div>
                          <div style="background: #fef3c7; padding: 6px; border-radius: 4px;">
                            <div style="font-weight: 600; color: #92400e;">CPM</div>
                            <div style="color: #78350f;">R$ ${sanitize(screen.reach && screen.price ? (screen.price / (screen.reach / 1000)).toFixed(2) : 'N/A')}</div>
                          </div>
                          <div style="background: #f3e8ff; padding: 6px; border-radius: 4px;">
                            <div style="font-weight: 600; color: #7c3aed;">Classe</div>
                            <div style="color: #5b21b6;">${sanitize(screen.class || 'N/A')}</div>
                          </div>
                        </div>
                      </div>
                      
                    </div>
                  `);
                } catch (markerError) {
                  console.error('❌ Erro ao adicionar marcador de tela:', screen.code, markerError);
                }
              } catch (createError) {
                console.error('❌ Erro ao criar marcador de tela:', screen.code, createError);
              }
            }
          });
          
          // Small delay to ensure all markers are added before updating existing ones
          setTimeout(() => {
            if (mapInstance.current && isMapReady(mapInstance.current)) {
              updateMarkers(L);
            }
          }, 200);
        }
      } catch (error) {
        console.error('❌ Erro ao centralizar mapa:', error);
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
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  const filteredPharmacies = useMemo(() => {
    const term = phSearch.trim().toLowerCase();
    const termDigits = term.replace(/[^0-9]/g, '');
    const radius = parseFloat(radiusKm);
    const hasRadius = !Number.isNaN(radius);
    const shouldFilterByRadius = Boolean(centerCoordinates && hasRadius && (layerMode === 'pharmacies' || layerMode === 'both'));

    return pharmacies
      .filter(p => p.latitude != null && p.longitude != null)
      .filter(p => phFilters.uf === 'all' || p.uf === phFilters.uf)
      .filter(p => phFilters.cidade === 'all' || p.cidade === phFilters.cidade)
      .filter(p => phFilters.bairro === 'all' || (p.bairro ?? '') === phFilters.bairro)
      .filter(p => phFilters.grupo === 'all' || (p.grupo ?? '') === phFilters.grupo)
      .filter(p => {
        if (!term) return true;
        const nome = (p.nome || '').toLowerCase();
        const grupo = (p.grupo || '').toLowerCase();
        const endereco = (p.endereco || '').toLowerCase();
        const bairro = (p.bairro || '').toLowerCase();
        const cep = (p.cep || '').replace(/[^0-9]/g, '');
        return (
          nome.includes(term) ||
          grupo.includes(term) ||
          endereco.includes(term) ||
          bairro.includes(term) ||
          (termDigits && cep.includes(termDigits))
        );
      })
      .filter(p => {
        if (!shouldFilterByRadius || !centerCoordinates) return true;
        const distance = calculateDistance(centerCoordinates.lat, centerCoordinates.lng, Number(p.latitude), Number(p.longitude));
        return distance <= radius;
      });
  }, [pharmacies, phFilters, phSearch, centerCoordinates, radiusKm, layerMode]);

  // Search by address and radius using LP logic
  // Função helper para adicionar marcador do centro da busca
  const addSearchCenterMarker = async (map: any, geocodeResult: any, addressSearch: string, radiusKm: string) => {
    try {
      if (!isMapReady(map)) {
        console.warn('⚠️ Mapa não está pronto para adicionar marcador do centro');
        return;
      }
      
      const L = await import('leaflet');
      const marker = L.marker([geocodeResult.lat, geocodeResult.lng], {
        icon: L.icon({
          iconUrl: marcadorLocalizacao,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        }),
        ...(({ isSearchCenter: true } as any))
      });
      
      try {
        marker.addTo(map);
        marker.bindPopup(`
          <div style="padding: 8px; text-align: center;">
            <h4 style="margin: 0 0 4px 0; font-weight: bold; color: #ef4444;">📍 Centro da Busca</h4>
            <p style="margin: 0; font-size: 12px;">${geocodeResult.google_formatted_address || addressSearch}</p>
            <p style="margin: 2px 0; font-size: 11px; color: #666;">Raio: ${radiusKm} km</p>
          </div>
        `).openPopup();
      } catch (addError) {
        console.error('❌ Erro ao adicionar marcador do centro:', addError);
      }
    } catch (error) {
      console.error('❌ Erro ao criar marcador do centro:', error);
    }
  };

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
      
      // Centralizar mapa na localização - aguardar mapa estar pronto
      if (!mapInstance.current) {
        console.warn('⚠️ Mapa não está inicializado');
        return;
      }
      
      const map = mapInstance.current;
      
      // Verificar se o mapa está pronto antes de operar
      if (!isMapReady(map)) {
        // Aguardar o mapa estar pronto
        map.whenReady(() => {
          try {
            if (isMapReady(map)) {
              map.setView([geocodeResult.lat, geocodeResult.lng], 12);
              addSearchCenterMarker(map, geocodeResult, addressSearch, radiusKm);
            }
          } catch (error) {
            console.error('❌ Erro ao centralizar mapa após whenReady:', error);
          }
        });
        return;
      }
      
      try {
        map.setView([geocodeResult.lat, geocodeResult.lng], 12);
        await addSearchCenterMarker(map, geocodeResult, addressSearch, radiusKm);
        
        // CRITICAL: Update markers to show search results on map (use LP logic)
        console.log('🎯 Atualizando marcadores no mapa após busca por endereço (lógica da LP)');
        
        // CLEAR PREVIOUS SEARCH DATA - Remove old search markers and circles
        if (isMapReady(map)) {
          const L = await import('leaflet');
          
          map.eachLayer((layer: any) => {
            if (layer.options && (layer.options.isSearchResult || layer.options.isRadiusCircle)) {
              map.removeLayer(layer);
            }
          });
          
          // Add radius circle like LP
          try {
            const radiusCircle = L.circle([geocodeResult.lat, geocodeResult.lng], {
              color: '#3b82f6',
              fillColor: '#3b82f6', 
              fillOpacity: 0.1,
              radius: parseInt(radiusKm) * 1000, // Convert km to meters
              isRadiusCircle: true // Flag to identify radius circles
            });
            radiusCircle.addTo(map);
          } catch (circleError) {
            console.error('❌ Erro ao adicionar círculo de raio:', circleError);
          }
          
          // Add screen markers from search results (LP style)
          searchResults.forEach((screen) => {
            if (screen.lat && screen.lng && isMapReady(map)) {
              try {
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
                });
                
                try {
                  screenMarker.addTo(map);
                  
                  screenMarker.bindPopup(`
                    <div style="padding: 12px; min-width: 280px; max-width: 320px;">
                      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #06b6d4; display: flex; align-items: center; justify-content: center;">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                        </div>
                        <div>
                          ${screen.name ? '<h4 style="font-weight: 700; color: #111827; font-size: 16px; margin: 0 0 4px 0;">' + sanitize(screen.name) + '</h4>' : ''}
                          ${screen.code ? '<p style="font-size: 12px; color: #0891b2; margin: 0;">Código: ' + sanitize(screen.code) + '</p>' : '<p style="font-size: 12px; color: #6b7280; margin: 0;">Sem código</p>'}
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
                } catch (markerError) {
                  console.error('❌ Erro ao adicionar marcador de tela:', screen.code, markerError);
                }
              } catch (createError) {
                console.error('❌ Erro ao criar marcador de tela:', screen.code, createError);
              }
            }
          });
          
          // Small delay to ensure all markers are added before updating existing ones
          setTimeout(() => {
            if (mapInstance.current && isMapReady(mapInstance.current)) {
              updateMarkers(L);
            }
          }, 200);
        }
      } catch (error) {
        console.error('❌ Erro ao centralizar mapa:', error);
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
    try {
      if (mapInstance.current && mapInstance.current.getContainer && mapInstance.current.getContainer()) {
        mapInstance.current.setView([lat, lng], 16);
      }
    } catch (error) {
      console.error('❌ Erro ao navegar para tela:', error);
    }

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

  const navigateToPharmacy = async (pharmacy: FarmaciaPublica) => {
    if (!mapInstance.current || pharmacy.latitude == null || pharmacy.longitude == null) {
      toast.error('Coordenadas não disponíveis para esta farmácia');
      return;
    }

    const lat = Number(pharmacy.latitude);
    const lng = Number(pharmacy.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error('Coordenadas inválidas para esta farmácia');
      return;
    }

    if (layerMode === 'venues') {
      setLayerMode('both');
    }

    toast.success(`📍 Navegando para ${pharmacy.nome || 'farmácia'}`);
    try {
      if (mapInstance.current && mapInstance.current.getContainer && mapInstance.current.getContainer()) {
        mapInstance.current.setView([lat, lng], 16);
      }
    } catch (error) {
      console.error('❌ Erro ao navegar para farmácia:', error);
    }

    const existingMarker = pharmacyMarkersRef.current.get(pharmacy.id);
    if (existingMarker) {
      setTimeout(() => {
        try {
          existingMarker.openPopup();
        } catch (error) {
          console.warn('⚠️ Não foi possível abrir o popup da farmácia selecionada:', error);
        }
      }, 300);
      return;
    }

    setTimeout(async () => {
      const markerAfterUpdate = pharmacyMarkersRef.current.get(pharmacy.id);
      if (markerAfterUpdate) {
        try {
          markerAfterUpdate.openPopup();
          return;
        } catch (error) {
          console.warn('⚠️ Não foi possível abrir o popup da farmácia após atualização:', error);
        }
      }

      const L = await import('leaflet');
      let popupFound = false;

      mapInstance.current?.eachLayer((layer: any) => {
        if (layer?.options?.isPharmacyMarker && layer.getLatLng) {
          const layerLatLng = layer.getLatLng();
          if (layerLatLng && Math.abs(layerLatLng.lat - lat) < 0.0001 && Math.abs(layerLatLng.lng - lng) < 0.0001) {
            if (layer.openPopup) {
              layer.openPopup();
              popupFound = true;
            }
          }
        }
      });

      if (!popupFound) {
        console.log('⚠️ Popup de farmácia não encontrado para', pharmacy.id);
      }
    }, 350);
  };

  // Função helper para verificar se o mapa está pronto
  const isMapReady = (map: any): boolean => {
    try {
      if (!map || !map.getContainer) return false;
      const container = map.getContainer();
      if (!container) return false;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      if (!(map as any)._loaded) return false;
      return true;
    } catch {
      return false;
    }
  };

  const updateMarkers = async (L: any) => {
    if (!mapInstance.current) return;
    
    const map = mapInstance.current;
    
    // Verificar se o mapa está totalmente inicializado
    if (!isMapReady(map)) {
      console.warn('⚠️ Mapa não está pronto para atualizar marcadores');
      return;
    }
    
    // Clear existing markers and heatmap layers
    map.eachLayer((layer: any) => {
      const layerOptions = layer.options || {};
      const isSearchLayer = layerOptions.isSearchCenter || layerOptions.isSearchResult || layerOptions.isMainSearchResult || layerOptions.isRadiusCircle;

      if (layerOptions.isPharmacyMarker) {
        map.removeLayer(layer);
        return;
      }

      if (layer instanceof L.Marker && !isSearchLayer) {
        map.removeLayer(layer);
        return;
      }

      if (layerMode === 'pharmacies' && layer instanceof L.Marker && (layerOptions.isSearchResult || layerOptions.isMainSearchResult)) {
        map.removeLayer(layer);
        return;
      }

      if (layerOptions.isHeatmap) {
        map.removeLayer(layer);
      }
    });

    pharmacyMarkersRef.current.clear();

    // Add heatmap layer if in heatmap mode
    if (viewMode === 'heatmap' && heatmapData.length > 0) {
      try {
        // Import leaflet.heat
        await import('leaflet.heat');
        
        const heatLayer = (L as any).heatLayer(heatmapData, {
          radius: 30,
          blur: 20,
          maxZoom: 15,
          max: 1.0,
          gradient: {
            0.0: 'blue',
            0.3: 'cyan', 
            0.5: 'lime',
            0.7: 'yellow',
            1.0: 'red'
          }
        });
        
        heatLayer.options.isHeatmap = true;
        map.addLayer(heatLayer);
        console.log('🔥 Heatmap layer added with', heatmapData.length, 'points');
      } catch (error) {
        console.error('❌ Erro ao adicionar heatmap:', error);
        toast.error('Erro ao carregar heatmap');
      }
    }

    // Show markers only in marker mode
    if (viewMode === 'markers') {
      // Draw screens based on selected layer
      const validScreens = screens.filter(s => s.lat && s.lng);
      const shouldShowScreens = layerMode === 'venues' || layerMode === 'both';
      const screensToDraw = shouldShowScreens ? (
        (layerMode === 'both' && centerCoordinates)
          ? validScreens.filter(screen => {
              const d = calculateDistance(centerCoordinates!.lat, centerCoordinates!.lng, Number(screen.lat), Number(screen.lng));
              return d <= parseFloat(radiusKm);
            })
          : validScreens
      ) : [];
      
      const markers: any[] = [];

      screensToDraw.forEach(screen => {
        const lat = Number(screen.lat);
        const lng = Number(screen.lng);
        
        if (isNaN(lat) || isNaN(lng)) return;

        // Use heart icon with color based on heat intensity
        let backgroundColor = '#06b6d4'; // Default cyan
        if (screen.heat_intensity !== undefined) {
          // Color based on heat intensity
          if (screen.heat_intensity > 0.7) backgroundColor = '#ef4444'; // Red - high intensity
          else if (screen.heat_intensity > 0.5) backgroundColor = '#f59e0b'; // Yellow - medium-high
          else if (screen.heat_intensity > 0.3) backgroundColor = '#10b981'; // Green - medium
          else backgroundColor = '#3b82f6'; // Blue - low intensity
        }
        
        if (!screen.active) backgroundColor = '#6b7280'; // Gray for inactive
        
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

      try {
        // Verificação mais robusta do mapa usando função helper
        if (!isMapReady(map)) {
          console.warn('⚠️ Mapa não está pronto para adicionar marcador:', screen.code);
          return;
        }
        
        const marker = L.marker([lat, lng], { icon });
        
        // Adicionar ao mapa de forma segura
        try {
          marker.addTo(map);
        } catch (addError) {
          console.error('❌ Erro ao adicionar marcador ao mapa:', screen.code, addError);
          return;
        }
        
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
              ${screen.name ? '<h4 style="font-weight: 700; color: #111827; font-size: 16px; margin: 0 0 4px 0;">' + sanitize(screen.name) + '</h4>' : ''}
              ${screen.code ? '<p style="font-size: 12px; color: #0891b2; margin: 0;">Código: ' + sanitize(screen.code) + '</p>' : '<p style="font-size: 12px; color: #6b7280; margin: 0;">Sem código</p>'}
            </div>
          </div>

          <div style="background: #f9fafb; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
            <h5 style="font-weight: 600; color: #374151; margin: 0 0 6px 0; font-size: 12px;">📍 Localização</h5>
            <div style="font-size: 11px; color: #374151;">
              <div><strong>Cidade:</strong> ${screen.city}, ${screen.state}</div>
              <div><strong>Status:</strong> ${screen.active ? '🟢 Ativa' : '🔴 Inativa'}</div>
              ${screen.proposal_count !== undefined ? `<div><strong>Propostas:</strong> ${screen.proposal_count}</div>` : ''}
              ${screen.heat_intensity !== undefined ? `<div><strong>Popularidade:</strong> ${(screen.heat_intensity * 100).toFixed(0)}%</div>` : ''}
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
      } catch (error) {
        console.error('❌ Erro ao criar marcador para tela:', screen.code, error);
      }
    });

      // Only fit bounds if no search is active (to preserve search center view)
      if (!centerCoordinates && markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
      }

      const shouldShowPharmacies = layerMode === 'pharmacies' || layerMode === 'both';

      if (shouldShowPharmacies) {
        const duplicateKey = (lat: number, lng: number) => `${lat.toFixed(6)}|${lng.toFixed(6)}`
        const duplicateMeta = new Map<string, { total: number; next: number }>()

        filteredPharmacies.forEach(pharmacy => {
          if (pharmacy.latitude == null || pharmacy.longitude == null) return
          const key = duplicateKey(Number(pharmacy.latitude), Number(pharmacy.longitude))
          const meta = duplicateMeta.get(key)
          if (!meta) duplicateMeta.set(key, { total: 1, next: 0 })
          else meta.total += 1
        })

        filteredPharmacies.forEach(pharmacy => {
          if (pharmacy.latitude == null || pharmacy.longitude == null) return
          let lat = Number(pharmacy.latitude)
          let lng = Number(pharmacy.longitude)

          if (Number.isNaN(lat) || Number.isNaN(lng)) return

          const key = duplicateKey(Number(pharmacy.latitude), Number(pharmacy.longitude))
          const meta = duplicateMeta.get(key)
          if (meta && meta.total > 1) {
            const angle = (meta.next / meta.total) * 2 * Math.PI
            const baseOffsetMeters = 5
            const dynamicOffsetMeters = baseOffsetMeters + meta.total
            const metersToDegreesLat = dynamicOffsetMeters / 111000
            const metersToDegreesLng = dynamicOffsetMeters / (111000 * Math.cos(lat * Math.PI / 180 || 1))
            lat += metersToDegreesLat * Math.cos(angle)
            lng += metersToDegreesLng * Math.sin(angle)
            meta.next += 1
          } else if (meta) {
            meta.next += 1
          }

          const icon = L.divIcon({
            className: 'pharmacy-marker',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            html: `
              <div style="
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 2px solid #ffffff;
                background: #ef4444;
                box-shadow: 0 2px 4px rgba(0,0,0,0.35);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <rect x="10" y="4" width="4" height="16" rx="1" fill="#ffffff" />
                  <rect x="4" y="10" width="16" height="4" rx="1" fill="#ffffff" />
                </svg>
              </div>
            `
          });

          const marker = L.marker([lat, lng], { icon } as any).addTo(map);
          (marker as any).options.isPharmacyMarker = true;
          (marker as any).options.pharmacyId = pharmacy.id;

          marker.bindPopup(`
            <div style="padding:12px; min-width: 260px; max-width: 320px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                <div style="position:relative;width:32px;height:32px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="10" y="4" width="4" height="16" rx="1" fill="#ffffff" />
                    <rect x="4" y="10" width="16" height="4" rx="1" fill="#ffffff" />
                  </svg>
                </div>
                <div>
                  <h4 style="font-weight:600;color:#111827;font-size:16px;margin:0;">${sanitize(pharmacy.nome || pharmacy.grupo || '')}</h4>
                  <p style="font-size:12px;color:#ef4444;margin:0;">Farmácia</p>
                </div>
              </div>
              <div style="background:#f9fafb;border-radius:6px;padding:10px;margin-bottom:8px;">
                <h5 style="font-weight:600;color:#374151;margin:0 0 6px 0;font-size:12px;">Localização</h5>
                <div style="font-size:11px;color:#374151;">
                  <div><strong>Endereço:</strong> ${sanitize((() => {
                    const streetParts = [pharmacy.tipo_logradouro, pharmacy.endereco].filter(Boolean).join(' ').trim();
                    const numberPart = pharmacy.numero ? String(pharmacy.numero).trim() : '';
                    const complementPart = pharmacy.complemento ? String(pharmacy.complemento).trim() : '';
                    const parts = [streetParts, numberPart].filter(Boolean).join(', ');
                    const withComplement = complementPart ? `${parts}${parts ? ' - ' : ''}${complementPart}` : parts;
                    return withComplement || 'Não informado';
                  })())}</div>
                  ${pharmacy.bairro ? `<div><strong>Bairro:</strong> ${sanitize(pharmacy.bairro)}</div>` : ''}
                  <div><strong>Cidade:</strong> ${sanitize(pharmacy.cidade || '')}, ${sanitize(pharmacy.uf || '')}</div>
                  ${pharmacy.grupo ? `<div><strong>Grupo:</strong> ${sanitize(pharmacy.grupo)}</div>` : ''}
                  ${pharmacy.cep ? `<div><strong>CEP:</strong> ${sanitize(pharmacy.cep)}</div>` : ''}
                </div>
              </div>
            </div>
          `);

          pharmacyMarkersRef.current.set(pharmacy.id, marker);
        });

        console.log('💊 Farmácias renderizadas no mapa:', filteredPharmacies.length);
      }
    }
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
            
            const firstTargetScreen = targetScreens.find(s => s.lat !== null && s.lng !== null);
            if (firstTargetScreen) {
              try {
                if (mapInstance.current && mapInstance.current.getContainer && mapInstance.current.getContainer()) {
                  mapInstance.current.setView([firstTargetScreen.lat!, firstTargetScreen.lng!], 12);
                }
              } catch (error) {
                console.error('❌ Erro ao centralizar mapa na primeira tela:', error);
              }
            }
            
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
                        ${screen.name ? '<h4 style="font-weight: 700; color: #111827; font-size: 16px; margin: 0 0 4px 0;">' + sanitize(screen.name) + '</h4>' : ''}
                        ${screen.code ? '<p style="font-size: 12px; color: #0891b2; margin: 0;">Código: ' + sanitize(screen.code) + '</p>' : '<p style="font-size: 12px; color: #6b7280; margin: 0;">Sem código</p>'}
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
                    ${screen.name ? '<h4 style="font-weight: 700; color: #111827; font-size: 16px; margin: 0 0 4px 0;">' + sanitize(screen.name) + '</h4>' : ''}
                    ${screen.code ? '<p style="font-size: 12px; color: #0891b2; margin: 0;">Código: ' + sanitize(screen.code) + '</p>' : '<p style="font-size: 12px; color: #6b7280; margin: 0;">Sem código</p>'}
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
    fetchPharmacies();
  }, [phFilters, centerCoordinates, radiusKm]);

  useEffect(() => {
    const total = pharmacies.length;
    const valid = pharmacies.filter(p => p.latitude != null && p.longitude != null).length;
    const rendered = (layerMode === 'pharmacies' || layerMode === 'both') ? filteredPharmacies.length : 0;
    setPhStats(prev => {
      if (
        prev.total === total &&
        prev.valid === valid &&
        prev.rendered === rendered
      ) {
        return prev;
      }
      return { total, valid, rendered };
    });
  }, [pharmacies, filteredPharmacies, layerMode]);

  useEffect(() => {
    if (screens.length > 0) {
      initializeMap();
    }
  }, [screens]);

  useEffect(() => {
    applyFilters();
  }, [screens, searchTerm, cityFilter, statusFilter, classFilter, centerCoordinates, radiusKm]);

  useEffect(() => {
    if (!mapInstance.current || !leafletRef.current) return;

    // Verificar se o mapa está pronto antes de atualizar marcadores
    const map = mapInstance.current;
    if (!map.getContainer || !map.getContainer()) {
      console.warn('⚠️ Mapa não está pronto no useEffect');
      return;
    }

    // Verificar se o mapa está carregado
    if (!(map as any)._loaded) {
      // Aguardar o mapa estar pronto
      map.whenReady(() => {
        if (markerRefreshTimeout.current) {
          window.clearTimeout(markerRefreshTimeout.current);
        }

        markerRefreshTimeout.current = window.setTimeout(() => {
          updateMarkers(leafletRef.current);
          markerRefreshTimeout.current = null;
        }, 120);
      });
      return;
    }

    if (markerRefreshTimeout.current) {
      window.clearTimeout(markerRefreshTimeout.current);
    }

    markerRefreshTimeout.current = window.setTimeout(() => {
      updateMarkers(leafletRef.current);
      markerRefreshTimeout.current = null;
    }, 120);

    return () => {
      if (markerRefreshTimeout.current) {
        window.clearTimeout(markerRefreshTimeout.current);
        markerRefreshTimeout.current = null;
      }
    };
  }, [
    screens,
    addressSearchResults,
    viewMode,
    layerMode,
    filteredPharmacies,
    centerCoordinates,
    radiusKm,
    heatmapData
  ]);

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

  // Função para exportar pontos filtrados para Excel
  const handleExportExcel = async () => {
    try {
      // Determinar quais dados exportar
      const dataToExport = addressSearchResults.length > 0 
        ? addressSearchResults 
        : mainSearchResults.length > 0 
          ? mainSearchResults 
          : filteredScreens;

      if (dataToExport.length === 0) {
        toast.warning('Nenhum ponto para exportar');
        return;
      }

      toast.info('Gerando planilha Excel...');

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Pontos Filtrados');

      // Definir colunas
      ws.columns = [
        { header: 'Código', key: 'code', width: 15 },
        { header: 'Nome', key: 'name', width: 35 },
        { header: 'Cidade', key: 'city', width: 20 },
        { header: 'Estado', key: 'state', width: 10 },
        { header: 'Classe', key: 'class', width: 10 },
        { header: 'Status', key: 'active', width: 12 },
        { header: 'Latitude', key: 'lat', width: 15 },
        { header: 'Longitude', key: 'lng', width: 15 },
        { header: 'Distância (km)', key: 'distance', width: 15 },
        { header: 'Alcance (pessoas/semana)', key: 'reach', width: 20 },
        { header: 'Investimento (R$/semana)', key: 'price', width: 20 },
        { header: 'CPM', key: 'cpm', width: 15 },
      ];

      // Preparar dados para exportação
      const rows = dataToExport.map((screen: any) => {
        const cpm = screen.reach && screen.price 
          ? (screen.price / (screen.reach / 1000)).toFixed(2)
          : 'N/A';

        return {
          code: screen.code || '',
          name: screen.name || screen.display_name || '',
          city: screen.city || '',
          state: screen.state || '',
          class: screen.class || 'ND',
          active: screen.active !== undefined ? (screen.active ? 'Ativo' : 'Inativo') : '',
          lat: screen.lat ? screen.lat.toString() : '',
          lng: screen.lng ? screen.lng.toString() : '',
          distance: screen.distance ? screen.distance.toFixed(2) : '',
          reach: screen.reach ? screen.reach.toString() : '',
          price: screen.price ? screen.price.toFixed(2) : '',
          cpm: cpm,
        };
      });

      ws.addRows(rows);

      // Estilizar cabeçalho
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Gerar arquivo
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pontos-filtrados-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Planilha gerada com sucesso! ${dataToExport.length} ponto(s) exportado(s).`);
    } catch (error: any) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao gerar planilha Excel: ' + (error.message || 'Erro desconhecido'));
    }
  };

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
          <div className="flex gap-2">
            <Button onClick={fetchScreens} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={pullAndFetchFarmacias} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Farmácias
            </Button>
            <div className="flex gap-1">
              <Button 
                onClick={() => setViewMode('markers')} 
                variant={viewMode === 'markers' ? 'default' : 'outline'} 
                size="sm"
              >
                <MapPin className="h-4 w-4 mr-1" />
                Marcadores
              </Button>
            <Button 
              onClick={() => setViewMode('heatmap')} 
              variant={viewMode === 'heatmap' ? 'default' : 'outline'} 
              size="sm"
            >
              <Flame className="h-4 w-4 mr-1" />
              Heatmap
            </Button>
            </div>
            <div className="ml-2 flex gap-1">
              <Button onClick={() => setLayerMode('venues')} variant={layerMode === 'venues' ? 'default' : 'outline'} size="sm">
                Telas
              </Button>
              <Button onClick={() => setLayerMode('pharmacies')} variant={layerMode === 'pharmacies' ? 'default' : 'outline'} size="sm">
                Farmácias
              </Button>
              <Button onClick={() => setLayerMode('both')} variant={layerMode === 'both' ? 'default' : 'outline'} size="sm">
                Ambos
              </Button>
            </div>
          </div>
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

        {/* Farmácias Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Farmácias (Total)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{phStats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Com Coordenadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{phStats.valid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Renderizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{phStats.rendered}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            {pharmaciesError && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{pharmaciesError}</AlertDescription>
              </Alert>
            )}
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
              <div>
                <label className="text-sm font-medium">Buscar Farmácia</label>
                <Input
                  placeholder="Nome, rede, endereço ou CEP"
                  value={phSearch}
                  onChange={(e) => setPhSearch(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">UF (Farmácia)</label>
                <Select value={phFilters.uf} onValueChange={(v) => setPhFilters({ ...phFilters, uf: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ufOptions.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf === 'all' ? 'Todas' : uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Cidade (Farmácia)</label>
                <Select value={phFilters.cidade} onValueChange={(v) => setPhFilters({ ...phFilters, cidade: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Array.from(new Set(pharmacies.map(p => (p.cidade || '')).filter(Boolean))).sort().map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Bairro (Farmácia)</label>
                <Select value={phFilters.bairro} onValueChange={(v) => setPhFilters({ ...phFilters, bairro: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Array.from(new Set(pharmacies.map(p => (p.bairro || '')).filter(Boolean))).sort().map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Grupo (Farmácia)</label>
                <Select value={phFilters.grupo} onValueChange={(v) => setPhFilters({ ...phFilters, grupo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Array.from(new Set(pharmacies.map(p => (p.grupo || '')).filter(Boolean))).sort().map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
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
        <div className={`grid grid-cols-1 gap-4 ${(addressSearchResults.length > 0 || (mainSearchResults.length > 0 && (searchTerm || cityFilter !== 'all' || statusFilter !== 'all' || classFilter !== 'all'))) ? 'lg:grid-cols-10' : ''}`}>
          <div className={`${(addressSearchResults.length > 0 || (mainSearchResults.length > 0 && (searchTerm || cityFilter !== 'all' || statusFilter !== 'all' || classFilter !== 'all'))) ? 'lg:col-span-7' : ''}`}>
            <Card className="relative z-0 overflow-hidden">
              <CardHeader>
                <CardTitle>Mapa das Telas</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden h-[700px]">
                      {mapError ? (
                  <Alert className="m-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{mapError}</AlertDescription>
                  </Alert>
                ) : (
                  <div ref={mapContainer} className="w-full h-full max-w-full rounded-lg overflow-hidden" />
              )}
              </CardContent>
            </Card>
                </div>

          {/* Sidebar com resultados - só aparece quando há busca ativa */}
          {(addressSearchResults.length > 0 || (mainSearchResults.length > 0 && (searchTerm || cityFilter !== 'all' || statusFilter !== 'all' || classFilter !== 'all'))) && (
            <div className="lg:col-span-3" data-sidebar="results">
                    <Card>
                      <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <MousePointer className="h-4 w-4" />
                        {addressSearchResults.length > 0 ? 'Resultados da Busca' : 'Resultados dos Filtros'}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {addressSearchResults.length > 0 
                          ? `${addressSearchResults.length} telas encontradas na busca`
                          : `${mainSearchResults.length} telas encontradas nos filtros`
                        }
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportExcel}
                      className="flex items-center gap-2"
                      disabled={addressSearchResults.length === 0 && mainSearchResults.length === 0}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel
                    </Button>
                  </div>
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
                          {screen.name ? (
                            <>
                              <span className="font-bold">{screen.name}</span>
                              {screen.code && <div className="text-xs text-cyan-600 mt-1">Código: {screen.code}</div>}
                            </>
                          ) : screen.code ? (
                            <span>Código: {screen.code}</span>
                          ) : (
                            <span className="text-muted-foreground">Sem código</span>
                          )}
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
                          {screen.name ? (
                            <>
                              <span className="font-bold">{screen.name}</span>
                              {screen.code && <div className="text-xs text-cyan-600 mt-1">Código: {screen.code}</div>}
                            </>
                          ) : screen.code ? (
                            <span>Código: {screen.code}</span>
                          ) : (
                            <span className="text-muted-foreground">Sem código</span>
                          )}
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
                            {screen.name ? (
                              <>
                                <p className="font-bold text-sm">{screen.name}</p>
                                {screen.code && <p className="text-xs text-cyan-600">Código: {screen.code}</p>}
                              </>
                            ) : screen.code ? (
                              <p className="font-medium text-sm">Código: {screen.code}</p>
                            ) : (
                              <p className="font-medium text-sm text-muted-foreground">Sem código</p>
                            )}
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
  }
