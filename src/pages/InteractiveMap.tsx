import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, Filter, Zap, ZapOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Simplified types to avoid type instantiation issues
interface SimpleScreen {
  id: string;
  name: string;
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

export default function InteractiveMap() {
  const [screens, setScreens] = useState<SimpleScreen[]>([]);
  const [filteredScreens, setFilteredScreens] = useState<SimpleScreen[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<SimpleScreen | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<MapFilters>({
    city: '',
    status: '',
    class: ''
  });
  const [loading, setLoading] = useState(true);

  // Available filter options
  const cities = Array.from(new Set(screens.map(s => s.city).filter(Boolean))).sort();
  const classes = Array.from(new Set(screens.map(s => s.class).filter(Boolean))).sort();

  useEffect(() => {
    fetchScreens();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [screens, searchTerm, filters]);

  const fetchScreens = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('screens')
        .select('id, name, city, state, lat, lng, active, class')
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (error) throw error;

      const mappedScreens: SimpleScreen[] = (data || []).map(screen => ({
        id: String(screen.id),
        name: screen.name || 'Tela sem nome',
        city: screen.city || '',
        state: screen.state || '',
        lat: screen.lat || 0,
        lng: screen.lng || 0,
        active: Boolean(screen.active),
        class: screen.class || 'ND'
      }));

      setScreens(mappedScreens);
    } catch (error) {
      console.error('Error fetching screens:', error);
      toast.error('Erro ao carregar telas');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = screens;

    // Text search
    if (searchTerm.trim()) {
      filtered = filtered.filter(screen =>
        screen.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        screen.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        screen.state.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // City filter
    if (filters.city) {
      filtered = filtered.filter(screen => screen.city === filters.city);
    }

    // Status filter
    if (filters.status) {
      const isActive = filters.status === 'active';
      filtered = filtered.filter(screen => screen.active === isActive);
    }

    // Class filter
    if (filters.class) {
      filtered = filtered.filter(screen => screen.class === filters.class);
    }

    setFilteredScreens(filtered);
  };

  const handleScreenSelect = (screen: SimpleScreen) => {
    setSelectedScreen(screen);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ city: '', status: '', class: '' });
    setSelectedScreen(null);
  };

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
        </div>

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
                    placeholder="Nome, cidade..."
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
                    <SelectItem value="">Todas as cidades</SelectItem>
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
                    <SelectItem value="">Todos os status</SelectItem>
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
                    <SelectItem value="">Todas as classes</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {filteredScreens.length} de {screens.length} telas
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Map and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Area */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Mapa das Telas
                </CardTitle>
                <CardDescription>
                  Mapa interativo será implementado em breve
                </CardDescription>
              </CardHeader>
              <CardContent className="h-full">
                <div className="w-full h-full bg-muted/20 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">Mapa em desenvolvimento</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Integração com mapas será adicionada em breve
                    </p>
                  </div>
                </div>
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
                          <p className="font-medium text-sm">{screen.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {screen.city}, {screen.state}
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
                    <label className="text-sm font-medium text-muted-foreground">Nome</label>
                    <p className="font-medium">{selectedScreen.name}</p>
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