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
  name: string;
  display_name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  active: boolean;
  class: string;
  address_raw?: string;
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
      class: 'A',
      address_raw: 'Av. Brigadeiro Luiz Antonio, 2232 - São Paulo, SP',
      venue_type_parent: 'Shopping',
      venue_type_child: 'Hall Principal',
      venue_type_grandchildren: 'Recepção',
      specialty: ['Shopping', 'Varejo']
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
      class: 'A',
      address_raw: 'R. Dona Adma Jafet, 91 - São Paulo, SP',
      venue_type_parent: 'Hospital',
      venue_type_child: 'Recepção',
      venue_type_grandchildren: 'Hall Principal',
      specialty: ['Saúde', 'Hospital']
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
      class: 'B',
      address_raw: 'Av. Paulista, 1000 - São Paulo, SP',
      venue_type_parent: 'Farmácia',
      venue_type_child: 'Loja',
      venue_type_grandchildren: 'Recepção',
      specialty: ['Farmácia', 'Saúde']
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
      class: 'AB',
      address_raw: 'R. Napoleão de Barros, 715 - São Paulo, SP',
      venue_type_parent: 'Clínica',
      venue_type_child: 'Hall Principal',
      venue_type_grandchildren: 'Recepção',
      specialty: ['Clínica Médica', 'Saúde']
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
  const [searchAddress, setSearchAddress] = useState('');
  const [searchRadius, setSearchRadius] = useState(2); // Raio padrão de 2KM
  const [loading, setLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [invalidScreensCount, setInvalidScreensCount] = useState(0);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  
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
              <h3 style="font-weight: 700; color: #111827; font-size: 18px; margin: 0 0 4px 0; line-height: 1.3; word-wrap: break-word;">${screen.display_name || 'Nome não informado'}</h3>
              <p style="font-size: 13px; color: #0891b2; font-weight: 600; margin: 0; line-height: 1.4;">Código: ${screen.name || 'N/A'}</p>
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
                <span style="font-size: 12px; color: #111827; font-weight: 500;">${screen.address_raw || 'Endereço não informado'}</span>
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
              <span style="font-size: 12px; padding: 2px 8px; border-radius: 12px; font-weight: 600; ${screen.active ? 'background: #dcfce7; color: #166534;' : 'background: #f3f4f6; color: #374151;'}">${screen.active ? 'Ativo' : 'Inativo'}</span>
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
        .select('id, name, display_name, city, state, lat, lng, active, class, address_raw, venue_type_parent, venue_type_child, venue_type_grandchildren, specialty')
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      // Se a coluna class não existir, buscar novamente sem ela
      if (error && error.code === '42703' && error.message.includes('column screens.class does not exist')) {
        console.log('⚠️ Coluna class não existe, buscando sem ela...');
        const { data: screensWithoutClass, error: errorWithoutClass } = await supabase
          .from('screens')
          .select('id, name, display_name, city, state, lat, lng, active, address_raw, venue_type_parent, venue_type_child, venue_type_grandchildren, specialty')
          .not('lat', 'is', null)
          .not('lng', 'is', null);
        
        // Adicionar propriedade class padrão aos dados
        data = screensWithoutClass?.map(screen => ({
          ...screen,
          class: 'ND'
        })) || null;
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
        class: (screen as any).class || 'ND',
        address_raw: (screen as any).address_raw || undefined,
        venue_type_parent: (screen as any).venue_type_parent || undefined,
        venue_type_child: (screen as any).venue_type_child || undefined,
        venue_type_grandchildren: (screen as any).venue_type_grandchildren || undefined,
        specialty: (screen as any).specialty || undefined
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
      
      // Geocodificar o endereço
      const coordinates = await geocodeAddress(searchAddress);
      if (!coordinates) {
        toast.error('Endereço não encontrado. Tente um endereço mais específico.');
        return;
      }

      console.log('📍 Coordenadas encontradas:', coordinates);

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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <label className="text-sm font-medium">Endereço</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rua, Av, Bairro, CEP..."
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Raio (KM)</label>
                <Select value={searchRadius.toString()} onValueChange={(value) => setSearchRadius(Number(value))}>
                  <SelectTrigger>
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

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {filteredScreens.length} de {screens.length} telas
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleAddressSearch}
                  disabled={!searchAddress.trim()}
                >
                  🔍 Buscar por Endereço
                </Button>
                <Button variant="outline" size="sm" onClick={fetchScreens}>
                  🔄 Recarregar
                </Button>
                <Button variant="outline" size="sm" onClick={closeAllPopups}>
                  ❌ Fechar Popups
                </Button>
                <Button variant="outline" size="sm" onClick={forceMapDisplay}>
                  🗺️ Forçar Mapa
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
            <Card className="h-[900px]">
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
                    ref={mapContainer} 
                    className="w-full h-full rounded-lg"
                    style={{ 
                      minHeight: '800px',
                      height: '800px',
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

          {/* Screen Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Telas</CardTitle>
                <CardDescription>
                  Clique em uma tela para ver detalhes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[800px] overflow-y-auto">
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

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}