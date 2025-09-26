import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Search, 
  Filter, 
  Zap, 
  ZapOff, 
  AlertCircle, 
  Map,
  List,
  Grid,
  RefreshCw,
  Settings,
  Eye,
  Target,
  Layers,
  Maximize,
  Minimize
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { searchScreensNearLocation } from '@/lib/search-service';
import { geocodeAddress } from '@/lib/geocoding';

// Estilos CSS para garantir que o popup fique acima dos marcadores
const popupStyles = `
  .mapboxgl-popup {
    z-index: 10000 !important;
  }
  .mapboxgl-popup-content {
    z-index: 10000 !important;
  }
  .custom-popup {
    z-index: 10000 !important;
  }
  .custom-marker {
    z-index: 10 !important;
  }
  .mapboxgl-popup-tip {
    z-index: 10000 !important;
  }
`;

// Constante global para classes padrão - ÚNICA DEFINIÇÃO
const DEFAULT_CLASSES = ['A', 'AB', 'ABC', 'B', 'BC', 'C', 'CD', 'D', 'E', 'ND'] as const;

// Simplified types to avoid type instantiation issues
interface SimpleScreen {
  id: string;
  code: string;
  name: string;
  display_name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  active: boolean;
  class: string;
  address?: string;
  venue_type_parent?: string;
  venue_type_child?: string;
  venue_type_grandchildren?: string;
  specialty?: string[];
}

interface MapFilters {
  city: string;
  status: string;
  class: string;
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
  const [searchAddress, setSearchAddress] = useState('');
  const [searchRadius, setSearchRadius] = useState(2); // Raio padrão de 2KM
  const [loading, setLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [invalidScreensCount, setInvalidScreensCount] = useState(0);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'grid'>('map');
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [mapStats, setMapStats] = useState({
    totalScreens: 0,
    activeScreens: 0,
    visibleScreens: 0
  });
  
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);


  // Available filter options - usar DEFAULT_CLASSES em vez de hardcoded
  const cities = Array.from(new Set(screens.map(s => s.city).filter(city => city && city.trim() !== ''))).sort();
  const existingClasses = Array.from(new Set(screens.map(s => s.class).filter(cls => cls && cls.trim() !== ''))).sort();
  const classes = availableClasses.length > 0 ? availableClasses : [...DEFAULT_CLASSES];
  const allPossibleClasses = DEFAULT_CLASSES;
  
  // Função corrigida para buscar classes - ÚNICA DEFINIÇÃO
  const fetchAvailableClasses = async () => {
    try {
      console.log('🔍 Buscando classes disponíveis via v_screens_enriched...');
      
      // Usar a view v_screens_enriched que já existe e tem todos os dados
      const { data, error } = await supabase
        .from('v_screens_enriched')
        .select('class')
        .not('class', 'is', null);
      
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

  // Buscar token do Mapbox quando o componente montar
  useEffect(() => {
    fetchMapboxToken();
  }, []);

  // Injetar estilos CSS para z-index dos popups
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = popupStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Monitorar quando o container do mapa estiver disponível
  useEffect(() => {
    if (mapContainer.current && mapboxToken && !map.current) {
      console.log('🎯 Container do mapa disponível, tentando inicializar...');
      
      // Garantir que o container tenha dimensões adequadas
      const container = mapContainer.current;
      container.style.minHeight = '800px';
      container.style.height = '800px';
      container.style.width = '100%';
      container.style.display = 'block';
      container.style.visibility = 'visible';
      
      setTimeout(() => initializeMap(), 100);
    }
  }, [mapContainer.current, mapboxToken]);

  // Forçar exibição do mapa após carregamento completo
  useEffect(() => {
    if (map.current && mapContainer.current) {
      const forceDisplay = () => {
        const container = map.current?.getContainer();
        if (container && (container.offsetWidth === 0 || container.offsetHeight === 0)) {
          console.log('🔄 Forçando exibição inicial do mapa...');
          forceMapDisplay();
        }
      };
      
      // Tentar forçar exibição após um delay
      setTimeout(forceDisplay, 500);
      setTimeout(forceDisplay, 1000);
      setTimeout(forceDisplay, 2000);
    }
  }, [map.current, mapContainer.current]);

  // Forçar exibição do mapa continuamente (solução mais agressiva)
  useEffect(() => {
    if (!map.current || !mapContainer.current) return;

    const continuousForceDisplay = () => {
      if (map.current && mapContainer.current) {
        const container = map.current.getContainer();
        const parentContainer = mapContainer.current;
        
        // Sempre forçar dimensões
        if (parentContainer) {
          parentContainer.style.minHeight = '800px';
          parentContainer.style.height = '800px';
          parentContainer.style.width = '100%';
          parentContainer.style.display = 'block';
          parentContainer.style.visibility = 'visible';
          parentContainer.style.position = 'relative';
        }
        
        if (container) {
          container.style.minHeight = '800px';
          container.style.height = '800px';
          container.style.width = '100%';
          container.style.display = 'block';
          container.style.visibility = 'visible';
          container.style.position = 'relative';
        }
        
        // Forçar resize e repaint
        map.current.resize();
        map.current.triggerRepaint();
      }
    };

    // Executar imediatamente
    continuousForceDisplay();
    
    // Executar a cada 500ms
    const interval = setInterval(continuousForceDisplay, 500);
    
    return () => clearInterval(interval);
  }, [map.current, mapContainer.current]);

  // Monitorar mudanças no container do mapa para detectar perda de dimensões
  useEffect(() => {
    if (!map.current || !mapContainer.current) return;

    const forceMapDisplay = () => {
      if (!map.current) return;
      
      const container = map.current.getContainer();
      const parentContainer = mapContainer.current;
      
      // Sempre forçar dimensões, independente do estado atual
      if (parentContainer) {
        parentContainer.style.minHeight = '800px';
        parentContainer.style.height = '800px';
        parentContainer.style.width = '100%';
        parentContainer.style.display = 'block';
        parentContainer.style.visibility = 'visible';
        parentContainer.style.position = 'relative';
        parentContainer.style.overflow = 'hidden';
      }
      
      container.style.minHeight = '800px';
      container.style.height = '800px';
      container.style.width = '100%';
      container.style.display = 'block';
      container.style.visibility = 'visible';
      container.style.position = 'relative';
      container.style.overflow = 'hidden';
      
      // Forçar resize e repaint com delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        if (map.current) {
          map.current.resize();
          map.current.triggerRepaint();
        }
      }, 100);
    };

    const checkContainerDimensions = () => {
      const container = map.current?.getContainer();
      if (container && (container.offsetWidth === 0 || container.offsetHeight === 0)) {
        console.log('⚠️ Container do mapa perdeu dimensões, corrigindo automaticamente...');
        console.log('📐 Dimensões atuais:', {
          offsetWidth: container.offsetWidth,
          offsetHeight: container.offsetHeight,
          clientWidth: container.clientWidth,
          clientHeight: container.clientHeight
        });
        forceMapDisplay();
      }
    };

    // Forçar exibição imediatamente
    forceMapDisplay();
    
    // Verificar dimensões periodicamente e sempre forçar exibição
    const interval = setInterval(() => {
      checkContainerDimensions();
      forceMapDisplay(); // Sempre forçar, mesmo se não detectar problema
    }, 2000); // Reduzir frequência para 2 segundos
    
    return () => clearInterval(interval);
  }, [map.current, mapContainer.current]);

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

  // Monitorar mudanças no layout e forçar redimensionamento do mapa
  useEffect(() => {
    if (!map.current) return;

    const handleResize = () => {
      if (map.current) {
        console.log('🔄 Window resize detectado, redimensionando mapa...');
        setTimeout(() => {
          if (map.current) {
            map.current.resize();
            map.current.triggerRepaint();
          }
        }, 100);
      }
    };

    // Adicionar listener para resize
    window.addEventListener('resize', handleResize);
    
    // Forçar redimensionamento inicial
    setTimeout(handleResize, 500);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [map.current]);

  // Solução específica para o problema de dimensões zero
  useEffect(() => {
    if (!map.current || !mapContainer.current) return;

    const fixMapDimensions = () => {
      const container = map.current?.getContainer();
      const parentContainer = mapContainer.current;
      
      if (container && (container.offsetWidth === 0 || container.offsetHeight === 0)) {
        console.log('🔧 Corrigindo dimensões do mapa...');
        
        // Forçar dimensões no container pai
        if (parentContainer) {
          parentContainer.style.cssText = `
            min-height: 800px !important;
            height: 800px !important;
            width: 100% !important;
            display: block !important;
            visibility: visible !important;
            position: relative !important;
            overflow: hidden !important;
          `;
        }
        
        // Forçar dimensões no container do mapa
        container.style.cssText = `
          min-height: 800px !important;
          height: 800px !important;
          width: 100% !important;
          display: block !important;
          visibility: visible !important;
          position: relative !important;
          overflow: hidden !important;
        `;
        
        // Forçar redimensionamento do mapa
        setTimeout(() => {
          if (map.current) {
            map.current.resize();
            map.current.triggerRepaint();
            console.log('✅ Dimensões do mapa corrigidas');
          }
        }, 200);
      }
    };

    // Executar imediatamente
    fixMapDimensions();
    
    // Executar periodicamente
    const interval = setInterval(fixMapDimensions, 3000);
    
    return () => clearInterval(interval);
  }, [map.current, mapContainer.current]);

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

  // useEffect para garantir que o mapa seja exibido após busca por endereço
  useEffect(() => {
    if (screens.length > 0 && map.current) {
      console.log('🔄 Telas atualizadas, verificando exibição do mapa...', {
        screensCount: screens.length,
        hasMap: !!map.current,
        isLoaded: map.current?.loaded(),
        containerVisible: map.current?.getContainer().offsetWidth > 0,
        containerHeight: map.current?.getContainer().offsetHeight
      });
      
      // Forçar resize do mapa para garantir que seja exibido
      setTimeout(() => {
        if (map.current) {
          const container = map.current.getContainer();
          
          // Verificar se o container perdeu suas dimensões
          if (container.offsetWidth === 0 || container.offsetHeight === 0) {
            console.log('⚠️ Container do mapa perdeu dimensões, corrigindo...');
            
            // Forçar dimensões mínimas
            container.style.minHeight = '800px';
            container.style.height = '800px';
            container.style.width = '100%';
            
            // Aguardar um frame antes de redimensionar
            requestAnimationFrame(() => {
              if (map.current) {
                map.current.resize();
                map.current.triggerRepaint();
                console.log('🔄 Mapa redimensionado e repintado após correção de dimensões');
              }
            });
          } else {
            map.current.resize();
            console.log('🔄 Mapa redimensionado após atualização de telas');
          }
        }
      }, 100);
    }
  }, [screens]);

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
      
      // Buscar token via função Supabase
      const { data, error } = await supabase.functions.invoke('mapbox-token');
      
      if (error) {
        console.warn('⚠️ Erro ao buscar token do Mapbox via Supabase:', error);
        // Usar um token público temporário para demonstração
        const fallbackToken = 'pk.eyJ1IjoidHZkb3V0b3JhZHMiLCJhIjoiY21ldTk2YzVjMDRpaTJsbXdoN3Rhd3NhNiJ9.XCRdHGYU-V1nyGOlepho4Q';
        setMapboxToken(fallbackToken);
        setMapError(null);
        return;
      }

      if (!data?.token) {
        console.warn('⚠️ Token do Mapbox não retornado pela função');
        // Usar um token público temporário para demonstração
        const fallbackToken = 'pk.eyJ1IjoidHZkb3V0b3JhZHMiLCJhIjoiY21ldTk2YzVjMDRpaTJsbXdoN3Rhd3NhNiJ9.XCRdHGYU-V1nyGOlepho4Q';
        setMapboxToken(fallbackToken);
        setMapError(null);
        return;
      }

      console.log('✅ Token do Mapbox obtido com sucesso');
      setMapboxToken(data.token);
      setMapError(null);
    } catch (error) {
      console.error('💥 Erro ao buscar token do Mapbox:', error);
      // Usar um token público temporário para demonstração
      const fallbackToken = 'pk.eyJ1IjoidHZkb3V0b3JhZHMiLCJhIjoiY21ldTk2YzVjMDRpaTJsbXdoN3Rhd3NhNiJ9.XCRdHGYU-V1nyGOlepho4Q';
      setMapboxToken(fallbackToken);
      setMapError(null);
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

    // Verificar e forçar dimensões do container
    const container = mapContainer.current;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn('⚠️ Container do mapa não tem dimensões válidas, forçando dimensões...');
      
      // Forçar dimensões mínimas
      container.style.minHeight = '800px';
      container.style.height = '800px';
      container.style.width = '100%';
      container.style.display = 'block';
      container.style.visibility = 'visible';
      
      // Aguardar um pouco e tentar novamente
      setTimeout(() => initializeMap(), 200);
      return;
    }

    console.log('🗺️ Inicializando mapa Mapbox...');
    console.log('📍 Container do mapa:', mapContainer.current);
    console.log('🔑 Token do Mapbox:', mapboxToken ? 'Configurado' : 'Não configurado');
    console.log('📐 Dimensões do container:', {
      width: mapContainer.current.offsetWidth,
      height: mapContainer.current.offsetHeight,
      clientWidth: mapContainer.current.clientWidth,
      clientHeight: mapContainer.current.clientHeight
    });
    
    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-46.6333, -23.5505], // São Paulo como centro padrão
        zoom: 3, // Zoom ainda menor para visão global do Brasil
        pitch: 0,
        bearing: 0,
        antialias: true
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
        setMapError(null);
        
        // Sistema de forçar exibição mais agressivo
        const forceMapVisibility = () => {
          if (!map.current) return;
          
          const container = map.current.getContainer();
          const parentContainer = mapContainer.current;
          
          // Forçar dimensões em ambos os containers
          if (parentContainer) {
            parentContainer.style.minHeight = '800px';
            parentContainer.style.height = '800px';
            parentContainer.style.width = '100%';
            parentContainer.style.display = 'block';
            parentContainer.style.visibility = 'visible';
            parentContainer.style.position = 'relative';
          }
          
          container.style.minHeight = '800px';
          container.style.height = '800px';
          container.style.width = '100%';
          container.style.display = 'block';
          container.style.visibility = 'visible';
          container.style.position = 'relative';
          
          // Forçar resize e repaint
          map.current.resize();
          map.current.triggerRepaint();
          
          console.log('🔄 Mapa forçado a ser visível');
        };
        
        // Executar imediatamente
        forceMapVisibility();
        
        // Executar novamente após delays
        setTimeout(forceMapVisibility, 100);
        setTimeout(forceMapVisibility, 500);
        setTimeout(forceMapVisibility, 1000);
        setTimeout(forceMapVisibility, 2000);
        
        // Verificar se o mapa está realmente renderizado
        setTimeout(() => {
          if (map.current) {
            console.log('🔍 Verificando renderização do mapa...', {
              isLoaded: map.current.loaded(),
              isStyleLoaded: map.current.isStyleLoaded(),
              container: map.current.getContainer(),
              containerVisible: map.current.getContainer().offsetWidth > 0
            });
          }
        }, 100);
        
        // Animação suave para mostrar todo o Brasil
        setTimeout(() => {
          if (map.current) {
            map.current.flyTo({
              center: [-46.6333, -23.5505], // Centro do Brasil
              zoom: 3,
              duration: 2000, // 2 segundos de animação suave
              essential: true
            });
          }
        }, 200);
        
        // Forçar atualização dos marcadores após a animação
        setTimeout(() => {
          if (filteredScreens.length > 0) {
            console.log('🔄 Forçando atualização de marcadores após carregamento do mapa...');
            const screensToProcess = [...filteredScreens];
            updateMapMarkersWithScreens(screensToProcess);
          }
        }, 2500); // Aguardar a animação terminar
      });

      map.current.on('error', (e) => {
        console.error('💥 Erro no mapa:', e);
        setMapError('Erro ao carregar o mapa: ' + e.error?.message);
      });

      // Evento para quando o estilo do mapa é carregado
      map.current.on('styledata', () => {
        console.log('🎨 Estilo do mapa carregado');
        if (map.current) {
          map.current.resize();
          map.current.triggerRepaint();
        }
      });

      // Evento para quando o mapa está totalmente pronto
      map.current.on('idle', () => {
        console.log('🔄 Mapa em estado idle - totalmente carregado');
        if (map.current) {
          console.log('🗺️ Estado final do mapa:', {
            isLoaded: map.current.loaded(),
            isStyleLoaded: map.current.isStyleLoaded(),
            container: map.current.getContainer(),
            containerVisible: map.current.getContainer().offsetWidth > 0,
            containerHeight: map.current.getContainer().offsetHeight
          });
        }
      });

    } catch (error) {
      console.error('💥 Erro ao criar mapa:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMapError('Erro ao inicializar o mapa: ' + errorMessage);
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
      console.log('🔍 Dados da tela no marcador:', { 
        id: screen.id, 
        code: screen.code, 
        name: screen.name, 
        display_name: screen.display_name 
      });
      console.log('🔍 Verificação de campos vazios:', {
        codeEmpty: !screen.code || screen.code.trim() === '',
        nameEmpty: !screen.name || screen.name.trim() === '',
        displayNameEmpty: !screen.display_name || screen.display_name.trim() === '',
        codeValue: `"${screen.code}"`,
        nameValue: `"${screen.name}"`,
        displayNameValue: `"${screen.display_name}"`
      });
      console.log(`📊 Coordenadas originais: lat=${screen.lat} (${typeof screen.lat}), lng=${screen.lng} (${typeof screen.lng})`);
      console.log(`🔢 Coordenadas convertidas: lat=${lat}, lng=${lng}`);
      console.log(`🗺️ Coordenadas para Mapbox: [${lng}, ${lat}]`);

      // Criar elemento customizado para o marcador (mesmo estilo da landing page)
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.dataset.screenId = screen.id; // Adicionar ID para poder encontrar o marcador depois
      
      // Usar o mesmo estilo da landing page
      el.innerHTML = `
        <div style="width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; background: #06b6d4; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; transform-origin: center center; z-index: 10;">
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

      // Criar popup (formato da landing page sem botão de anunciar)
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        className: 'custom-popup',
        maxWidth: '400px'
      }).setHTML(`
        <div style="padding: 16px; min-width: 320px; max-width: 380px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
          <!-- Header com ícone e título -->
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #06b6d4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <div style="flex: 1; min-width: 0;">
              <h3 style="font-weight: 700; color: #111827; font-size: 18px; margin: 0 0 4px 0; line-height: 1.3; word-wrap: break-word;">${(screen.code || 'Código não informado')} ${(screen.name || screen.display_name || 'Nome não informado')}</h3>
              <script>console.log('🔍 Popup screen data:', { code: '${screen.code}', name: '${screen.name}', display_name: '${screen.display_name}' });</script>
              <p style="font-size: 13px; color: #0891b2; font-weight: 600; margin: 0; line-height: 1.4;">Código: ${screen.code || 'N/A'}</p>
            </div>
          </div>

          <!-- Card de Localização -->
          <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 12px; border-left: 4px solid #06b6d4;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <h4 style="font-weight: 600; color: #374151; font-size: 14px; margin: 0;">Localização</h4>
            </div>
            <div style="space-y: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Endereço</span>
                <span style="font-size: 12px; color: #111827; font-weight: 500;">${screen.address || 'Endereço não informado'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Cidade</span>
                <span style="font-size: 12px; color: #111827; font-weight: 600;">${screen.city || 'N/A'}, ${screen.state || 'N/A'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Coordenadas</span>
                <span style="font-size: 11px; color: #6b7280; font-family: monospace;">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
              </div>
            </div>
          </div>

          <!-- Card de Classificação -->
          <div style="background: #fef3c7; border-radius: 8px; padding: 12px; margin-bottom: 12px; border-left: 4px solid #f59e0b;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <h4 style="font-weight: 600; color: #374151; font-size: 14px; margin: 0;">Classificação</h4>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Classe</span>
              <span style="font-size: 12px; padding: 2px 8px; border-radius: 12px; font-weight: 600; background: #fbbf24; color: #92400e;">${screen.class || 'ND'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
              <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Status</span>
              <span style="font-size: 12px; padding: 2px 8px; border-radius: 12px; font-weight: 600; ${screen.screen_active ? 'background: #dcfce7; color: #166534;' : 'background: #f3f4f6; color: #374151;'}">${screen.screen_active ? 'Ativo' : 'Inativo'}</span>
            </div>
          </div>

          <!-- Card de Informações do Venue -->
          ${screen.venue_type_parent || screen.venue_type_child || screen.venue_type_grandchildren ? `
          <div style="background: #f0fdf4; border-radius: 8px; padding: 12px; margin-bottom: 12px; border-left: 4px solid #22c55e;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <h4 style="font-weight: 600; color: #374151; font-size: 14px; margin: 0;">Informações do Venue</h4>
            </div>
            <div style="space-y: 4px;">
              ${screen.venue_type_parent ? `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Tipo Principal</span>
                <span style="font-size: 12px; color: #111827; font-weight: 600;">${screen.venue_type_parent}</span>
              </div>
              ` : ''}
              ${screen.venue_type_child ? `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Subtipo</span>
                <span style="font-size: 12px; color: #111827; font-weight: 600;">${screen.venue_type_child}</span>
              </div>
              ` : ''}
              ${screen.venue_type_grandchildren ? `
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Categoria</span>
                <span style="font-size: 12px; color: #111827; font-weight: 600;">${screen.venue_type_grandchildren}</span>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}

          <!-- Card de Especialidades -->
          ${screen.specialty && screen.specialty.length > 0 ? `
          <div style="background: #fef3c7; border-radius: 8px; padding: 12px; margin-bottom: 12px; border-left: 4px solid #f59e0b;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <h4 style="font-weight: 600; color: #374151; font-size: 14px; margin: 0;">Especialidades</h4>
            </div>
            <div style="display: flex; flex-wrap: gap: 4px;">
              ${screen.specialty.map(spec => `
                <span style="font-size: 11px; padding: 2px 6px; border-radius: 8px; font-weight: 500; background: #fbbf24; color: #92400e;">${spec}</span>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <!-- Card de Performance (dados simulados para demonstração) -->
          <div style="background: #f0f9ff; border-radius: 8px; padding: 12px; border-left: 4px solid #0ea5e9;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#0ea5e9">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
              </svg>
              <h4 style="font-weight: 600; color: #374151; font-size: 14px; margin: 0;">Performance</h4>
            </div>
            <div style="space-y: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Alcance</span>
                <span style="font-size: 12px; color: #111827; font-weight: 600;">${Math.floor(Math.random() * 2000) + 500} pessoas/semana</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Investimento</span>
                <span style="font-size: 12px; color: #111827; font-weight: 600;">R$ ${(Math.random() * 200 + 50).toFixed(2)}/semana</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; color: #6b7280; font-weight: 500;">CPM</span>
                <span style="font-size: 12px; color: #111827; font-weight: 600;">R$ ${(Math.random() * 50 + 25).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      `);

      console.log('📋 Popup criado para:', screen.display_name);

      // Criar marcador usando coordenadas validadas
      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);

      // Adicionar evento de clique direto no marcador para abrir popup
      marker.on('click', () => {
        console.log('🎯 Clique no marcador via Mapbox:', screen.display_name);
        
        // Fechar todos os outros popups antes de abrir o novo
        markers.current.forEach(otherMarker => {
          if (otherMarker !== marker && otherMarker.getPopup()?.isOpen()) {
            otherMarker.getPopup()?.remove();
          }
        });
        
        setSelectedScreen(screen);
        marker.togglePopup();
      });

      // Adicionar evento de clique no marcador
      marker.getElement().addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('🖱️ Clique no marcador:', screen.display_name);
        
        // Fechar todos os outros popups antes de abrir o novo
        markers.current.forEach(otherMarker => {
          if (otherMarker !== marker && otherMarker.getPopup()?.isOpen()) {
            otherMarker.getPopup()?.remove();
          }
        });
        
        setSelectedScreen(screen);
        marker.togglePopup();
      });

      // Adicionar evento de abertura do popup para garantir que apenas um esteja aberto
      const markerPopup = marker.getPopup();
      if (markerPopup) {
        markerPopup.on('open', () => {
          console.log('📋 Popup aberto para:', screen.display_name);
          // Fechar todos os outros popups quando este abrir
          markers.current.forEach(otherMarker => {
            if (otherMarker !== marker && otherMarker.getPopup()?.isOpen()) {
              otherMarker.getPopup()?.remove();
            }
          });
        });
      }

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

  const fetchScreens = async () => {
    setLoading(true);
    try {
      console.log('🔍 Iniciando busca por telas via v_screens_enriched...');
      
      // Usar a view v_screens_enriched que já existe e tem todos os dados
      const { data, error } = await supabase
        .from('v_screens_enriched')
        .select(`
          id, code, name, display_name, city, state, cep, address, lat, lng, geom,
          screen_active, class, specialty, board_format, category, rede,
          standard_rate_month, selling_rate_month, spots_per_hour, spot_duration_secs,
          venue_name, venue_address, venue_country, venue_state, venue_district,
          staging_nome_ponto, staging_audiencia, staging_especialidades,
          staging_tipo_venue, staging_subtipo, staging_categoria
        `);

      if (error) {
        console.error('❌ Erro na query v_screens_enriched:', error);
        throw new Error(`Erro na consulta: ${error.message}`);
      }

      console.log('📊 Dados retornados:', { 
        total: data?.length || 0, 
        sample: data?.slice(0, 3) 
      });
      
      // Log detalhado da primeira tela para debug
      if (data && data.length > 0) {
        const firstScreen = data[0];
        console.log('🔍 Primeira tela do banco (antes do mapeamento):', {
          id: firstScreen.id,
          code: firstScreen.code,
          name: firstScreen.name,
          class: firstScreen.class,
          address: firstScreen.address,
          codeType: typeof firstScreen.code,
          nameType: typeof firstScreen.name,
          classType: typeof firstScreen.class
        });
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ Nenhuma tela encontrada na base de dados');
        setScreens([]);
        return;
      }

      // Contar telas sem coordenadas válidas
      const invalidCount = data?.filter(s => !s.lat || !s.lng).length || 0;
      setInvalidScreensCount(invalidCount);

      const mappedScreens: SimpleScreen[] = data.map(screen => ({
        id: String(screen.id),
        code: screen.code || 'Código não informado',
        name: screen.name || 'Nome não informado',
        display_name: screen.staging_nome_ponto || screen.name || 'Nome não informado',
        city: screen.city || 'Cidade não informada',
        state: screen.state || 'Estado não informado',
        lat: Number(screen.lat) || 0,
        lng: Number(screen.lng) || 0,
        active: Boolean(screen.screen_active),
        class: screen.class || 'ND',
        address: screen.address || undefined,
        venue_type_parent: screen.staging_tipo_venue || screen.venue_type_parent || undefined,
        venue_type_child: screen.staging_subtipo || screen.venue_type_child || undefined,
        venue_type_grandchildren: screen.staging_categoria || screen.venue_type_grandchildren || undefined,
        specialty: screen.staging_especialidades ? screen.staging_especialidades.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined
      }));

      console.log('✅ Telas processadas:', mappedScreens.length);
      console.log('🔍 Primeira tela mapeada:', mappedScreens[0]);
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
      console.log('🔍 Buscando por termo:', searchTerm);
      console.log('🔍 Total de telas antes da busca:', filtered.length);
      
      filtered = filtered.filter(screen => {
        const codeMatch = screen.code.toLowerCase().includes(searchTerm.toLowerCase());
        const nameMatch = screen.name.toLowerCase().includes(searchTerm.toLowerCase());
        const displayNameMatch = screen.display_name.toLowerCase().includes(searchTerm.toLowerCase());
        const cityMatch = screen.city.toLowerCase().includes(searchTerm.toLowerCase());
        const stateMatch = screen.state.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matches = codeMatch || nameMatch || displayNameMatch || cityMatch || stateMatch;
        
        if (matches) {
          console.log('✅ Tela encontrada:', {
            code: screen.code,
            name: screen.name,
            display_name: screen.display_name,
            city: screen.city,
            state: screen.state,
            codeMatch,
            nameMatch,
            displayNameMatch,
            cityMatch,
            stateMatch
          });
        }
        
        return matches;
      });
      
      console.log('🔍 Total de telas após busca:', filtered.length);
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
    console.log('🎯 Tela selecionada:', screen.display_name);
    
    // Fechar todos os popups abertos antes de abrir o novo
    markers.current.forEach(marker => {
      if (marker.getPopup()?.isOpen()) {
        marker.getPopup()?.remove();
      }
    });
    
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
        
        // Abrir o popup do marcador correspondente após o zoom
        setTimeout(() => {
          const marker = markers.current.find(m => {
            const markerElement = m.getElement();
            return markerElement && markerElement.dataset.screenId === screen.id;
          });
          
          if (marker) {
            console.log('🎯 Abrindo popup do marcador:', screen.display_name);
            marker.togglePopup();
          }
        }, 1000); // Aguardar o zoom terminar
      } else {
        console.warn('⚠️ Coordenadas inválidas para zoom:', { lat: screen.lat, lng: screen.lng });
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSearchAddress('');
    setSearchRadius(2);
    setFilters({ city: 'all', status: 'all', class: 'all' });
    setSelectedScreen(null);
    
    // Fechar todos os popups abertos
    markers.current.forEach(marker => {
      if (marker.getPopup()?.isOpen()) {
        marker.getPopup()?.remove();
      }
    });
  };

  const closeAllPopups = () => {
    markers.current.forEach(marker => {
      if (marker.getPopup()?.isOpen()) {
        marker.getPopup()?.remove();
      }
    });
  };

  const forceMapDisplay = () => {
    if (map.current) {
      console.log('🔄 Forçando exibição do mapa...');
      
      const container = map.current.getContainer();
      const parentContainer = mapContainer.current;
      
      console.log('📐 Dimensões atuais do container:', {
        offsetWidth: container.offsetWidth,
        offsetHeight: container.offsetHeight,
        clientWidth: container.clientWidth,
        clientHeight: container.clientHeight
      });
      
      // Forçar dimensões em ambos os containers
      if (parentContainer) {
        parentContainer.style.minHeight = '800px';
        parentContainer.style.height = '800px';
        parentContainer.style.width = '100%';
        parentContainer.style.display = 'block';
        parentContainer.style.visibility = 'visible';
      }
      
      container.style.minHeight = '800px';
      container.style.height = '800px';
      container.style.width = '100%';
      container.style.display = 'block';
      container.style.visibility = 'visible';
      
      // Múltiplas tentativas de correção
      const attemptForceDisplay = (attempt: number) => {
        if (attempt > 3) return; // Máximo 3 tentativas
        
        setTimeout(() => {
          if (map.current) {
            map.current.resize();
            map.current.triggerRepaint();
            
            // Verificar se funcionou
            const currentContainer = map.current.getContainer();
            if (currentContainer.offsetWidth > 0 && currentContainer.offsetHeight > 0) {
              console.log('🔄 Mapa forçado a exibir com sucesso');
              
              // Forçar atualização dos marcadores
              if (filteredScreens.length > 0) {
                setTimeout(() => {
                  updateMapMarkersWithScreens(filteredScreens);
                }, 200);
              }
            } else {
              console.log(`🔄 Tentativa ${attempt} de forçar exibição falhou, tentando novamente...`);
              attemptForceDisplay(attempt + 1);
            }
          }
        }, 200 * attempt); // Delay progressivo
      };
      
      attemptForceDisplay(1);
    } else {
      console.warn('⚠️ Mapa não está disponível para forçar exibição');
    }
  };

  const handleAddressSearch = async () => {
    if (!searchAddress.trim()) {
      toast.error('Por favor, digite um endereço para buscar');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Iniciando busca por endereço:', searchAddress);
      console.log('🔍 Raio de busca configurado:', searchRadius, 'km');
      
      // Verificar se a chave da API está configurada
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      console.log('🔑 Google Maps API Key configurada:', apiKey ? 'SIM' : 'NÃO');
      
      // Geocodificar o endereço
      const coordinates = await geocodeAddress(searchAddress);
      if (!coordinates) {
        toast.error('Endereço não encontrado. Tente um endereço mais específico.');
        return;
      }

      console.log('📍 Coordenadas encontradas:', coordinates);
      console.log('📍 Endereço formatado:', coordinates.google_formatted_address);

      // Buscar telas próximas ao endereço
      const searchParams = {
        lat: coordinates.lat,
        lng: coordinates.lng,
        startDate: new Date().toISOString().split('T')[0],
        durationWeeks: '1',
        addressName: searchAddress,
        formattedAddress: coordinates.google_formatted_address || searchAddress,
        placeId: coordinates.google_place_id || '',
        radiusKm: searchRadius
      };
      
      console.log('🔍 Parâmetros de busca:', searchParams);
      const nearbyScreens = await searchScreensNearLocation(searchParams);

      console.log('🎯 Telas encontradas:', nearbyScreens.length);

      if (nearbyScreens.length === 0) {
        toast.info(`Nenhuma tela encontrada em um raio de ${searchRadius}km do endereço informado.`);
        return;
      }

      // Converter ScreenSearchResult para SimpleScreen
      const convertedScreens: SimpleScreen[] = nearbyScreens.map(screen => ({
        id: screen.id,
        code: screen.code,
        name: screen.name,
        display_name: screen.display_name,
        city: screen.city,
        state: screen.state,
        lat: screen.lat,
        lng: screen.lng,
        active: screen.active,
        class: screen.class,
        address_raw: screen.address_raw
      }));

      // Atualizar as telas com os resultados da busca
      setScreens(convertedScreens);
      
      // Centralizar o mapa no endereço buscado
      if (map.current) {
        console.log('🗺️ Centralizando mapa no endereço buscado...');
        
        // Primeiro, garantir que o mapa esteja visível
        const container = map.current.getContainer();
        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
          console.log('🔄 Container do mapa sem dimensões, forçando resize...');
          map.current.resize();
        }
        
        map.current.flyTo({
          center: [coordinates.lng, coordinates.lat],
          zoom: 12,
          duration: 1000
        });
        
        // Forçar atualização dos marcadores após o flyTo
        setTimeout(() => {
          console.log('🔄 Forçando atualização de marcadores após busca...');
          const container = map.current?.getContainer();
          console.log('🗺️ Estado do mapa:', {
            hasMap: !!map.current,
            isLoaded: map.current?.loaded(),
            container: container,
            containerVisible: container ? container.offsetWidth > 0 : false,
            containerHeight: container ? container.offsetHeight : 0
          });
          
          // Forçar exibição do mapa com múltiplas tentativas
          if (map.current) {
            // Verificar se o container ainda tem dimensões
            const container = map.current.getContainer();
            if (container.offsetWidth === 0 || container.offsetHeight === 0) {
              console.log('⚠️ Container ainda sem dimensões, tentando corrigir...');
              
              // Forçar dimensões mínimas
              container.style.minHeight = '800px';
              container.style.height = '800px';
              container.style.width = '100%';
              
              // Aguardar um frame e tentar novamente
              requestAnimationFrame(() => {
                if (map.current) {
                  map.current.resize();
                  map.current.triggerRepaint();
                }
              });
            } else {
              map.current.resize();
              map.current.triggerRepaint();
            }
          }
          
          updateMapMarkersWithScreens(convertedScreens);
        }, 1200);
      } else {
        console.warn('⚠️ Mapa não está disponível para centralização');
      }

      toast.success(`${nearbyScreens.length} telas encontradas em um raio de ${searchRadius}km!`);

    } catch (error) {
      console.error('❌ Erro na busca por endereço:', error);
      toast.error('Erro ao buscar endereço. Tente novamente.');
    } finally {
      setLoading(false);
    }
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
  
  // Atualizar estatísticas quando as telas mudarem
  useEffect(() => {
    const stats = {
      totalScreens: screens.length,
      activeScreens: screens.filter(s => s.active).length,
      visibleScreens: filteredScreens.length
    };
    setMapStats(stats);
  }, [screens, filteredScreens]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold mb-2">Carregando Mapa</h3>
              <p className="text-muted-foreground">
                Inicializando o mapa interativo e carregando dados das telas...
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Map className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mapa Interativo</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Visualize e explore todas as telas de mídia exterior • {mapStats.totalScreens} telas cadastradas
                  </p>
                </div>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'map' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('map')}
                    className="gap-2"
                  >
                    <Map className="h-4 w-4" />
                    Mapa
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="gap-2"
                  >
                    <Grid className="h-4 w-4" />
                    Grade
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="gap-2"
                  >
                    <List className="h-4 w-4" />
                    Lista
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Total de Telas</p>
                    <p className="text-2xl font-bold text-blue-900">{mapStats.totalScreens}</p>
                  </div>
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Telas Ativas</p>
                    <p className="text-2xl font-bold text-green-900">{mapStats.activeScreens}</p>
                  </div>
                  <Zap className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-800">Visíveis</p>
                    <p className="text-2xl font-bold text-purple-900">{mapStats.visibleScreens}</p>
                  </div>
                  <Eye className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-800">Cidades</p>
                    <p className="text-2xl font-bold text-orange-900">{cities.length}</p>
                  </div>
                  <MapPin className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Classes</p>
                    <p className="text-2xl font-bold text-gray-900">{existingClasses.length}</p>
                  </div>
                  <Layers className="h-8 w-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {invalidScreensCount > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>{invalidScreensCount} telas</strong> não possuem coordenadas válidas e não aparecem no mapa.
                Verifique os dados de latitude e longitude.
              </AlertDescription>
            </Alert>
          )}

          {mapError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Erro no mapa:</strong> {mapError}
                {mapError.includes('não configurado') && (
                  <div className="mt-2 text-sm">
                    Configure o token do Mapbox nas variáveis de ambiente do projeto.
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Enhanced Filters */}
          <Card className="bg-gradient-to-r from-gray-50/50 to-blue-50/50 border-l-4 border-l-primary">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                Filtros Avançados
              </CardTitle>
              <CardDescription>
                Use os filtros para encontrar telas específicas ou explore por localização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primary Search */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Busca Geral</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Código, nome, cidade..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Busca por Endereço</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Rua, Av, Bairro, CEP..."
                      value={searchAddress}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      className="pl-10 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Filter Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Cidade</label>
                  <Select value={filters.city} onValueChange={(value) => setFilters(prev => ({ ...prev, city: value }))}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Todas" />
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
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Classe</label>
                  <Select value={filters.class} onValueChange={(value) => setFilters(prev => ({ ...prev, class: value }))}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as classes</SelectItem>
                      {classes.map(cls => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Raio (KM)</label>
                  <Select value={searchRadius.toString()} onValueChange={(value) => setSearchRadius(Number(value))}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="2 KM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 KM</SelectItem>
                      <SelectItem value="2">2 KM</SelectItem>
                      <SelectItem value="5">5 KM</SelectItem>
                      <SelectItem value="10">10 KM</SelectItem>
                      <SelectItem value="20">20 KM</SelectItem>
                      <SelectItem value="50">50 KM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando <strong>{filteredScreens.length}</strong> de <strong>{screens.length}</strong> telas
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleAddressSearch}
                    disabled={!searchAddress.trim()}
                    className="gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Buscar Endereço
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchScreens} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Recarregar
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content based on view mode */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="space-y-6">
            <TabsContent value="map">
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Map */}
                <div className="xl:col-span-3">
                  <Card className={`${isMapFullscreen ? 'fixed inset-4 z-50' : 'h-[600px] lg:h-[800px]'} shadow-lg`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Map className="w-5 h-5 text-primary" />
                          Mapa das Telas
                          {filteredScreens.length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {filteredScreens.length} marcadores
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                            className="gap-2"
                          >
                            {isMapFullscreen ? (
                              <>
                                <Minimize className="h-4 w-4" />
                                Sair do Fullscreen
                              </>
                            ) : (
                              <>
                                <Maximize className="h-4 w-4" />
                                Fullscreen
                              </>
                            )}
                          </Button>
                          <Button variant="outline" size="sm" onClick={forceMapDisplay} className="gap-2">
                            <Settings className="h-4 w-4" />
                            Ajustar Mapa
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="h-[calc(100%-120px)] p-0">
                      {mapError ? (
                        <div className="w-full h-full bg-muted/20 rounded-lg flex items-center justify-center m-4">
                          <div className="text-center p-6">
                            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <p className="text-lg font-medium text-muted-foreground">Mapa indisponível</p>
                            <p className="text-sm text-muted-foreground mt-2 max-w-sm">{mapError}</p>
                          </div>
                        </div>
                      ) : !mapboxToken ? (
                        <div className="w-full h-full bg-muted/20 rounded-lg flex items-center justify-center m-4">
                          <div className="text-center p-6">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-lg font-medium text-muted-foreground">Carregando mapa...</p>
                          </div>
                        </div>
                      ) : (
                        <div 
                          ref={mapContainer} 
                          className="w-full h-full rounded-lg"
                          style={{ 
                            minHeight: '500px',
                            height: '100%',
                            width: '100%',
                            display: 'block',
                            visibility: 'visible',
                            position: 'relative',
                            overflow: 'hidden',
                            backgroundColor: '#f0f0f0'
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Screen Details Sidebar */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Telas Próximas</CardTitle>
                      <CardDescription>
                        Clique em uma tela para destacar no mapa
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[700px] overflow-y-auto">
                      {filteredScreens.slice(0, 20).map(screen => (
                        <div
                          key={screen.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                            selectedScreen?.id === screen.id 
                              ? 'bg-primary/10 border-primary shadow-md' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleScreenSelect(screen)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {screen.active ? (
                                <Zap className="w-4 h-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <ZapOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{screen.code}</p>
                                <p className="text-sm text-gray-600 truncate">{screen.name}</p>
                                <p className="text-xs text-gray-500 truncate">
                                  {screen.city}, {screen.state}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge 
                                variant={screen.active ? 'default' : 'secondary'} 
                                className="text-xs"
                              >
                                {screen.class}
                              </Badge>
                              {selectedScreen?.id === screen.id && (
                                <Badge variant="outline" className="text-xs">
                                  Selecionado
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {filteredScreens.length === 0 && (
                        <div className="text-center py-8">
                          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500 font-medium">Nenhuma tela encontrada</p>
                          <p className="text-sm text-gray-400 mt-1">
                            Ajuste os filtros ou busque por localização
                          </p>
                        </div>
                      )}
                      
                      {filteredScreens.length > 20 && (
                        <div className="text-center py-4 border-t">
                          <p className="text-sm text-gray-500">
                            E mais {filteredScreens.length - 20} telas...
                          </p>
                          <Button variant="outline" size="sm" className="mt-2">
                            Ver todas na lista
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="grid">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredScreens.map(screen => (
                  <ScreenCard key={screen.id} screen={screen} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list">
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {filteredScreens.map(screen => (
                      <ScreenListItem key={screen.id} screen={screen} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );

  // Componente de Card para tela
  function ScreenCard({ screen }: { screen: SimpleScreen }) {
    return (
      <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {screen.active ? (
                  <Zap className="w-4 h-4 text-green-600" />
                ) : (
                  <ZapOff className="w-4 h-4 text-gray-400" />
                )}
                <Badge variant={screen.active ? 'default' : 'secondary'} className="text-xs">
                  {screen.class}
                </Badge>
              </div>
              <CardTitle className="text-sm font-medium">{screen.code}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleScreenSelect(screen)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <p className="text-sm text-gray-600 line-clamp-2">{screen.name}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="h-3 w-3" />
              <span>{screen.city}, {screen.state}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Componente de Item da Lista
  function ScreenListItem({ screen }: { screen: SimpleScreen }) {
    return (
      <div className="p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${screen.active ? 'bg-green-100' : 'bg-gray-100'}`}>
              {screen.active ? (
                <Zap className="w-5 h-5 text-green-600" />
              ) : (
                <ZapOff className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="font-medium">{screen.code} - {screen.name}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {screen.city}, {screen.state}
                </span>
                <Badge variant={screen.active ? 'default' : 'secondary'} className="text-xs">
                  {screen.class}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleScreenSelect(screen)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Ver no Mapa
          </Button>
        </div>
      </div>
    );
  }
}
