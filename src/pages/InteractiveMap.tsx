import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Search, Filter, Zap, ZapOff, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Constante global para classes padrão - ÚNICA DEFINIÇÃO
const DEFAULT_CLASSES = ['A', 'AB', 'ABC', 'B', 'BC', 'C', 'CD', 'D', 'E', 'ND'] as const;

// Simplified types to avoid type instantiation issues
interface SimpleScreen {
  id: string;
  name: string;
  display_name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  active: boolean;
  class: string;
}

interface MapFilters {
  city: string;
  status: string;
  class: string;
}

// Função para gerar dados de teste quando não há dados no banco
function getTestScreens(): SimpleScreen[] {
  console.log('🧪 Usando dados de teste para o mapa interativo');
  
  return [
    {
      id: 'test-1',
      name: 'SP001',
      display_name: 'Shopping Iguatemi - Hall Principal',
      city: 'São Paulo',
      state: 'SP',
      lat: -23.550520,
      lng: -46.633308,
      active: true,
      class: 'A'
    },
    {
      id: 'test-2',
      name: 'SP002',
      display_name: 'Hospital Sírio-Libanês - Recepção',
      city: 'São Paulo',
      state: 'SP',
      lat: -23.550520,
      lng: -46.633308,
      active: true,
      class: 'A'
    },
    {
      id: 'test-3',
      name: 'SP003',
      display_name: 'Farmácia Pague Menos - Paulista',
      city: 'São Paulo',
      state: 'SP',
      lat: -23.5615,
      lng: -46.6565,
      active: true,
      class: 'B'
    },
    {
      id: 'test-4',
      name: 'SP004',
      display_name: 'Clínica São Paulo - Hall Principal',
      city: 'São Paulo',
      state: 'SP',
      lat: -23.550520,
      lng: -46.633308,
      active: true,
      class: 'AB'
    },
    {
      id: 'test-5',
      name: 'SP005',
      display_name: 'Shopping Morumbi - Praça Central',
      city: 'São Paulo',
      state: 'SP',
      lat: -23.550520,
      lng: -46.633308,
      active: true,
      class: 'A'
    },
    {
      id: 'test-6',
      name: 'RJ001',
      display_name: 'Shopping Leblon - Hall Principal',
      city: 'Rio de Janeiro',
      state: 'RJ',
      lat: -22.970722,
      lng: -43.182365,
      active: true,
      class: 'A'
    },
    {
      id: 'test-7',
      name: 'RJ002',
      display_name: 'Hospital Copa D\'Or - Recepção',
      city: 'Rio de Janeiro',
      state: 'RJ',
      lat: -22.970722,
      lng: -43.182365,
      active: true,
      class: 'A'
    },
    {
      id: 'test-8',
      name: 'BH001',
      display_name: 'Shopping Del Rey - Hall Principal',
      city: 'Belo Horizonte',
      state: 'MG',
      lat: -19.9167,
      lng: -43.9345,
      active: true,
      class: 'A'
    }
  ];
}

export default function InteractiveMap() {
  const [screens, setScreens] = useState<SimpleScreen[]>([]);
  const [filteredScreens, setFilteredScreens] = useState<SimpleScreen[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<SimpleScreen | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<MapFilters>({
    city: 'all',
    status: 'all',
    class: 'all'
  });
  const [loading, setLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [invalidScreensCount, setInvalidScreensCount] = useState(0);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  // Callback para quando o container for montado
  const handleContainerRef = (node: HTMLDivElement | null) => {
    if (node) {
      mapContainer.current = node;
      console.log('🎯 Container do mapa montado no DOM');
      // Tentar inicializar o mapa se o token já estiver disponível
      if (mapboxToken && !map.current) {
        console.log('🔄 Container montado, tentando inicializar mapa');
        setTimeout(() => initializeMap(), 100); // Pequeno delay para garantir que o DOM está pronto
      }
    }
  };

  // Available filter options - usar DEFAULT_CLASSES em vez de hardcoded
  const cities = Array.from(new Set(screens.map(s => s.city).filter(city => city && city.trim() !== ''))).sort();
  const existingClasses = Array.from(new Set(screens.map(s => s.class).filter(cls => cls && cls.trim() !== ''))).sort();
  const classes = availableClasses.length > 0 ? availableClasses : [...DEFAULT_CLASSES];
  const allPossibleClasses = DEFAULT_CLASSES;
  
  // Função corrigida para buscar classes - ÚNICA DEFINIÇÃO
  const fetchAvailableClasses = async () => {
    try {
      console.log('🔍 Buscando classes disponíveis...');
      
      // Tentar buscar com a coluna class primeiro, se falhar, usar classes padrão
      let { data, error } = await supabase
        .from('screens')
        .select('class')
        .not('class', 'is', null);
      
      // Se a coluna class não existir, usar classes padrão
      if (error && error.code === '42703' && error.message.includes('column screens.class does not exist')) {
        console.log('⚠️ Coluna class não existe, usando classes padrão...');
        data = null;
        error = null;
      }
      
      console.log('📊 Resposta do Supabase:', { data, error });
      
      if (error) {
        console.error('❌ Erro na consulta:', error);
        setAvailableClasses([...DEFAULT_CLASSES]);
        return;
      }
      
      if (data && data.length > 0) {
        const uniqueClasses = Array.from(new Set(data.map(s => s.class).filter(Boolean))).sort();
        console.log('✅ Classes encontradas:', uniqueClasses);
        setAvailableClasses(uniqueClasses);
      } else {
        console.log('⚠️ Nenhuma classe encontrada, usando fallback');
        setAvailableClasses([...DEFAULT_CLASSES]);
      }
    } catch (error) {
      console.error('Erro ao buscar classes:', error);
      setAvailableClasses([...DEFAULT_CLASSES]);
    }
  };

  useEffect(() => {
    fetchAvailableClasses();
  }, []);

  useEffect(() => {
    fetchMapboxToken();
    fetchScreens();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [screens, searchTerm, filters]);

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
  }, [mapboxToken]);

  // useEffect adicional para atualizar marcadores quando o mapa for inicializado
  useEffect(() => {
    if (map.current && filteredScreens.length > 0) {
      console.log('🔄 Mapa inicializado, forçando atualização de marcadores...', {
        hasMap: !!map.current,
        screensCount: filteredScreens.length
      });
      const screensToProcess = [...filteredScreens];
      updateMapMarkersWithScreens(screensToProcess);
    }
  }, [map.current, filteredScreens]);

  useEffect(() => {
    console.log('🔄 useEffect filteredScreens disparado:', { 
      hasMap: !!map.current, 
      screensCount: filteredScreens.length,
      screens: filteredScreens.slice(0, 2) // Mostrar primeiras 2 telas para debug
    });
    
    if (map.current) {
      if (filteredScreens.length > 0) {
        console.log('🔄 filteredScreens atualizado, atualizando marcadores...', filteredScreens.length);
        // Usar uma cópia local para evitar problemas de closure
        const screensToProcess = [...filteredScreens];
        updateMapMarkersWithScreens(screensToProcess);
      } else {
        console.log('🔄 filteredScreens vazio, limpando marcadores...');
        // Limpar marcadores existentes
        markers.current.forEach(marker => marker.remove());
        markers.current = [];
      }
    }
  }, [filteredScreens]);

  const fetchMapboxToken = async () => {
    try {
      console.log('🗺️ Buscando token do Mapbox...');
      
      // Usar token diretamente do arquivo .env (igual à landing page)
      const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
      
      if (!token) {
        console.warn('⚠️ Token do Mapbox não configurado, usando fallback');
        // Usar um token público temporário para demonstração
        const fallbackToken = 'pk.eyJ1IjoidHZkb3V0b3JhZHMiLCJhIjoiY21ldTk2YzVjMDRpaTJsbXdoN3Rhd3NhNiJ9.XCRdHGYU-V1nyGOlepho4Q';
        setMapboxToken(fallbackToken);
        setMapError(null);
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
      console.log('🚫 Não foi possível inicializar o mapa:', {
        hasToken: !!mapboxToken,
        hasContainer: !!mapContainer.current,
        hasMap: !!map.current
      });
      return;
    }

    console.log('🗺️ Inicializando mapa Mapbox...');
    console.log('📍 Container do mapa:', mapContainer.current);
    
    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-46.6333, -23.5505], // São Paulo como centro padrão
        zoom: 10
      });

      console.log('🗺️ Mapa criado:', map.current);
      console.log('📐 Dimensões do container:', {
        width: mapContainer.current.offsetWidth,
        height: mapContainer.current.offsetHeight,
        clientWidth: mapContainer.current.clientWidth,
        clientHeight: mapContainer.current.clientHeight
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      map.current.on('load', () => {
        console.log('✅ Mapa carregado com sucesso');
        // Forçar resize do mapa para garantir renderização
        setTimeout(() => {
          if (map.current) {
            map.current.resize();
            console.log('🔄 Mapa redimensionado');
          }
        }, 100);
        
        // Forçar atualização dos marcadores após o mapa carregar
        setTimeout(() => {
          if (filteredScreens.length > 0) {
            console.log('🔄 Forçando atualização de marcadores após carregamento do mapa...');
            const screensToProcess = [...filteredScreens];
            updateMapMarkersWithScreens(screensToProcess);
          }
        }, 200);
      });

      map.current.on('error', (e) => {
        console.error('💥 Erro no mapa:', e);
        setMapError('Erro ao carregar o mapa: ' + e.error?.message);
      });

    } catch (error) {
      console.error('💥 Erro ao criar mapa:', error);
      setMapError('Erro ao inicializar o mapa: ' + error.message);
    }
  };

  const updateMapMarkersWithScreens = (screens: SimpleScreen[]) => {
    console.log('🗺️ Atualizando marcadores do mapa com telas específicas...', { 
      hasMap: !!map.current, 
      screensCount: screens.length 
    });
    
    if (!map.current) {
      console.warn('⚠️ Mapa não está inicializado');
      return;
    }

    // Limpar marcadores existentes
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    if (screens.length === 0) {
      console.log('⚠️ Nenhuma tela fornecida para mostrar');
      return;
    }

    console.log('📍 Adicionando marcadores para', screens.length, 'telas');

    // Adicionar novos marcadores
    screens.forEach((screen, index) => {
      // Validar coordenadas mais rigorosamente
      const lat = Number(screen.lat);
      const lng = Number(screen.lng);
      
      if (!screen.lat || !screen.lng || isNaN(lat) || isNaN(lng)) {
        console.warn(`⚠️ Tela ${screen.id} não tem coordenadas válidas:`, { lat: screen.lat, lng: screen.lng });
        return;
      }
      
      // Validar se as coordenadas estão dentro de limites razoáveis para o Brasil
      if (lat < -35 || lat > 5 || lng < -75 || lng > -30) {
        console.warn(`⚠️ Tela ${screen.id} tem coordenadas fora do Brasil:`, { lat, lng });
        return;
      }

      console.log(`📍 Criando marcador ${index + 1}/${screens.length} para ${screen.display_name}`);
      console.log(`📊 Coordenadas originais: lat=${screen.lat} (${typeof screen.lat}), lng=${screen.lng} (${typeof screen.lng})`);
      console.log(`🔢 Coordenadas convertidas: lat=${lat}, lng=${lng}`);
      console.log(`🗺️ Coordenadas para Mapbox: [${lng}, ${lat}]`);

      // Criar elemento customizado para o marcador (mesmo estilo da landing page)
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.dataset.screenId = screen.id; // Adicionar ID para poder encontrar o marcador depois
      
      // Usar o mesmo estilo da landing page
      el.innerHTML = `
        <div style="width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; background: #06b6d4; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; transform-origin: center center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
      `;
      
      // Adicionar hover effect sem mover o marcador
      const markerDiv = el.querySelector('div') as HTMLElement;
      
      el.addEventListener('mouseenter', () => {
        if (markerDiv) {
          markerDiv.style.transform = 'scale(1.1)';
          markerDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        }
        el.style.zIndex = '1000';
      });
      
      el.addEventListener('mouseleave', () => {
        if (markerDiv) {
          markerDiv.style.transform = 'scale(1)';
          markerDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
        }
        el.style.zIndex = '1';
      });

      // Criar popup (mesmo estilo da landing page)
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false
      }).setHTML(`
        <div style="padding: 12px; min-width: 280px; max-width: 320px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: #06b6d4; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <div style="flex: 1; min-width: 0;">
              <h4 style="font-weight: 600; color: #111827; font-size: 16px; margin: 0 0 2px 0; line-height: 1.3; word-wrap: break-word;">${screen.display_name}</h4>
              <p style="font-size: 12px; color: #0891b2; font-weight: 500; margin: 0; line-height: 1.4;">Código: ${screen.name}</p>
            </div>
          </div>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; color: #6b7280; font-weight: 500;">Localização</span>
              <span style="font-size: 13px; color: #111827; font-weight: 600;">${screen.city}, ${screen.state}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; color: #6b7280; font-weight: 500;">Classe</span>
              <span style="font-size: 13px; color: #111827; font-weight: 600;">${screen.class}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 13px; color: #6b7280; font-weight: 500;">Status</span>
              <span style="font-size: 12px; padding: 2px 8px; border-radius: 12px; font-weight: 500; ${screen.active ? 'background: #dcfce7; color: #166534;' : 'background: #f3f4f6; color: #374151;'}">${screen.active ? 'Ativo' : 'Inativo'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 13px; color: #6b7280; font-weight: 500;">Coordenadas</span>
              <span style="font-size: 12px; color: #6b7280; font-family: monospace;">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
            </div>
          </div>
        </div>
      `);

      // Criar marcador usando coordenadas validadas
      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);

      // Adicionar evento de clique
      el.addEventListener('click', () => {
        setSelectedScreen(screen);
        marker.togglePopup();
      });

      markers.current.push(marker);
    });

    console.log(`✅ ${markers.current.length} marcadores adicionados ao mapa`);

    // Ajustar zoom para mostrar todos os marcadores
    if (screens.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      screens.forEach(screen => {
        const lat = Number(screen.lat);
        const lng = Number(screen.lng);
        if (screen.lat && screen.lng && !isNaN(lat) && !isNaN(lng) && 
            lat >= -35 && lat <= 5 && lng >= -75 && lng <= -30) {
          bounds.extend([lng, lat]);
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

  // Função original para compatibilidade
  const updateMapMarkers = () => {
    updateMapMarkersWithScreens(filteredScreens);
  };

  const fetchScreens = async () => {
    setLoading(true);
    try {
      console.log('🔍 Iniciando busca por telas...');
      
      // Primeiro, vamos verificar a conexão com o Supabase
      const { error: testError } = await supabase
        .from('screens')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('❌ Erro de conexão com Supabase:', testError);
        throw new Error(`Erro de conexão: ${testError.message}`);
      }
      
      console.log('✅ Conexão com Supabase OK');

      // Primeiro buscar todas as telas para contar inválidas
      const { data: allScreens, error: allError } = await supabase
        .from('screens')
        .select('id, lat, lng');

      if (allError) {
        console.error('❌ Erro ao buscar contagem de telas:', allError);
      } else {
        const invalidCount = allScreens?.filter(s => !s.lat || !s.lng).length || 0;
        setInvalidScreensCount(invalidCount);
      }

      // Agora buscar as telas válidas
      // Tentar buscar com a coluna class primeiro, se falhar, buscar sem ela
      let { data, error } = await supabase
        .from('screens')
        .select('id, name, display_name, city, state, lat, lng, active, class')
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      // Se a coluna class não existir, buscar novamente sem ela
      if (error && error.code === '42703' && error.message.includes('column screens.class does not exist')) {
        console.log('⚠️ Coluna class não existe, buscando sem ela...');
        const { data: screensWithoutClass, error: errorWithoutClass } = await supabase
          .from('screens')
          .select('id, name, display_name, city, state, lat, lng, active')
          .not('lat', 'is', null)
          .not('lng', 'is', null);
        
        data = screensWithoutClass;
        error = errorWithoutClass;
      }

      if (error) {
        console.error('❌ Erro na query screens:', error);
        throw new Error(`Erro na consulta: ${error.message}`);
      }

      console.log('📊 Dados retornados:', { 
        total: data?.length || 0, 
        sample: data?.slice(0, 3) 
      });

      if (!data || data.length === 0) {
        console.warn('⚠️ Nenhuma tela encontrada na base de dados - usando dados de teste');
        // Usar dados de teste para desenvolvimento
        const testScreens = getTestScreens();
        setScreens(testScreens);
        return;
      }

      const mappedScreens: SimpleScreen[] = data.map(screen => ({
        id: String(screen.id),
        name: screen.name || 'Código não informado',
        display_name: screen.display_name || 'Nome não informado',
        city: screen.city || 'Cidade não informada',
        state: screen.state || 'Estado não informado',
        lat: Number(screen.lat) || 0,
        lng: Number(screen.lng) || 0,
        active: Boolean(screen.active),
        class: (screen as any).class || 'ND'
      }));

      console.log('✅ Telas processadas:', mappedScreens.length);
      setScreens(mappedScreens);
      
      if (mappedScreens.length > 0) {
        toast.success(`${mappedScreens.length} telas carregadas com sucesso`);
      }
      
    } catch (error: unknown) {
      console.error('💥 Erro completo ao buscar telas:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        error
      });
      
      // Mensagem de erro mais específica
      let errorMessage = 'Erro ao carregar telas';
      const errorMessageStr = error instanceof Error ? error.message : String(error);
      
      if (errorMessageStr.includes('JWT')) {
        errorMessage = 'Erro de autenticação. Tente fazer login novamente.';
      } else if (errorMessageStr.includes('permission')) {
        errorMessage = 'Sem permissão para acessar os dados.';
      } else if (errorMessageStr.includes('connection')) {
        errorMessage = 'Erro de conexão com o banco de dados.';
      }
      
      toast.error(errorMessage);
      setScreens([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    console.log('🔍 Aplicando filtros...', { 
      totalScreens: screens.length, 
      searchTerm, 
      filters 
    });
    
    let filtered = screens;

    // Text search
    if (searchTerm.trim()) {
      filtered = filtered.filter(screen =>
        screen.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        screen.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        screen.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        screen.state.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // City filter
    if (filters.city && filters.city !== 'all') {
      filtered = filtered.filter(screen => screen.city === filters.city);
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      const isActive = filters.status === 'active';
      filtered = filtered.filter(screen => screen.active === isActive);
    }

    // Class filter
    if (filters.class && filters.class !== 'all') {
      filtered = filtered.filter(screen => screen.class === filters.class);
    }

    console.log('✅ Filtros aplicados:', { 
      original: screens.length, 
      filtered: filtered.length 
    });
    
    setFilteredScreens(filtered);
  }, [screens, searchTerm, filters]);

  const handleScreenSelect = (screen: SimpleScreen) => {
    setSelectedScreen(screen);
    
    // Fazer zoom no mapa para mostrar apenas este ponto
    if (map.current && screen.lat && screen.lng) {
      const lat = Number(screen.lat);
      const lng = Number(screen.lng);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        console.log('🎯 Fazendo zoom para tela:', screen.display_name);
        console.log('🎯 Coordenadas para zoom:', { lat, lng });
        
        // Fazer zoom para o ponto específico
        map.current.flyTo({
          center: [lng, lat],
          zoom: 15,
          duration: 1000,
          essential: true
        });
        
        // Abrir o popup do marcador correspondente
        const marker = markers.current.find(m => {
          const markerElement = m.getElement();
          return markerElement && markerElement.dataset.screenId === screen.id;
        });
        
        if (marker) {
          marker.togglePopup();
        }
      } else {
        console.warn('⚠️ Coordenadas inválidas para zoom:', { lat: screen.lat, lng: screen.lng });
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ city: 'all', status: 'all', class: 'all' });
    setSelectedScreen(null);
  };

  // Remover a função handleDebug e o botão de debug
  // const handleDebug = async () => {
  //   toast.info('Executando diagnóstico...');
  //   const result = await runSupabaseDebug();
  //   
  //   if (result && typeof result === 'object' && 'authenticated' in result) {
  //     toast.success('Diagnóstico concluído! Verifique o console para detalhes.');
  //   } else {
  //     toast.error('Problemas encontrados no diagnóstico. Verifique o console.');
  //   }
  // };
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando mapa...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mapa Interativo</h1>
          <p className="text-muted-foreground">Visualize e gerencie todas as telas no mapa</p>
          
          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <strong>Debug:</strong> {screens.length} telas carregadas | 
              Estado: {loading ? 'Carregando...' : 'Pronto'} |
              Filtradas: {filteredScreens.length} |
              Classes disponíveis: {classes.join(', ')}
            </div>
          )}
        </div>

        {/* Invalid screens alert */}
        {invalidScreensCount > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>{invalidScreensCount} telas</strong> não possuem coordenadas válidas e não aparecem no mapa.
              Verifique os dados de latitude e longitude.
            </AlertDescription>
          </Alert>
        )}

        {/* Mapbox token error */}
        {mapError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Erro no mapa:</strong> {mapError}
              {mapError.includes('não configurado') && (
                <div className="mt-2 text-sm">
                  Para configurar o token do Mapbox:
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Acesse o painel do Supabase</li>
                    <li>Vá em Edge Functions → Secrets</li>
                    <li>Adicione MAPBOX_PUBLIC_TOKEN com seu token público</li>
                  </ol>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Código, nome, cidade..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cidade</label>
                <Select value={filters.city} onValueChange={(value) => setFilters(prev => ({ ...prev, city: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as cidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as cidades</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Classe</label>
                <Select value={filters.class} onValueChange={(value) => setFilters(prev => ({ ...prev, class: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as classes</SelectItem>
                    {classes.map(cls => {
                      const hasScreens = existingClasses.includes(cls);
                      return (
                        <SelectItem key={cls} value={cls}>
                          {cls} {!hasScreens && '(sem telas)'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {existingClasses.length < allPossibleClasses.length && (
                  <p className="text-xs text-muted-foreground">
                    💡 Algumas classes não possuem telas cadastradas no momento
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {filteredScreens.length} de {screens.length} telas
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchScreens}>
                  🔄 Recarregar
                </Button>
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Area */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Mapa das Telas
                  {filteredScreens.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {filteredScreens.length} marcadores
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Clique nos marcadores para ver detalhes das telas
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(100%-120px)] p-0">
                {mapError ? (
                  <div className="w-full h-full bg-muted/20 rounded-lg flex items-center justify-center m-4">
                    <div className="text-center p-6">
                      <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium text-muted-foreground">Mapa indisponível</p>
                      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                        {mapError}
                      </p>
                    </div>
                  </div>
                ) : !mapboxToken ? (
                  <div className="w-full h-full bg-muted/20 rounded-lg flex items-center justify-center m-4">
                    <div className="text-center p-6">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-lg font-medium text-muted-foreground">Carregando mapa...</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Configurando token de acesso
                      </p>
                    </div>
                  </div>
                ) : (
                  <div 
                    ref={handleContainerRef} 
                    className="w-full h-full rounded-lg"
                    style={{ 
                      minHeight: '400px',
                      height: '500px',
                      width: '100%'
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Screen Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Telas</CardTitle>
                <CardDescription>
                  Clique em uma tela para ver detalhes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredScreens.map(screen => (
                  <div
                    key={screen.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedScreen?.id === screen.id 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleScreenSelect(screen)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {screen.active ? (
                          <Zap className="w-4 h-4 text-green-600" />
                        ) : (
                          <ZapOff className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{screen.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {screen.name} • {screen.city}, {screen.state}
                          </p>
                        </div>
                      </div>
                      <Badge variant={screen.active ? 'default' : 'secondary'} className="text-xs">
                        {screen.class}
                      </Badge>
                    </div>
                  </div>
                ))}

                {filteredScreens.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhuma tela encontrada</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedScreen && (
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes da Tela</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Código</label>
                    <p className="font-medium">{selectedScreen.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nome</label>
                    <p className="font-medium">{selectedScreen.display_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Localização</label>
                    <p>{selectedScreen.city}, {selectedScreen.state}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Coordenadas</label>
                    <p className="text-sm">
                      {selectedScreen.lat.toFixed(6)}, {selectedScreen.lng.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge variant={selectedScreen.active ? 'default' : 'secondary'}>
                        {selectedScreen.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Classe</label>
                    <p>{selectedScreen.class}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}