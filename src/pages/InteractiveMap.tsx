import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, Filter, Zap, ZapOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { runSupabaseDebug } from '@/utils/debugSupabase';

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
    city: 'all',
    status: 'all',
    class: 'all'
  });
  const [loading, setLoading] = useState(true);

  // Available filter options - garantir que não há valores vazios
  const cities = Array.from(new Set(screens.map(s => s.city).filter(city => city && city.trim() !== ''))).sort();
  const classes = Array.from(new Set(screens.map(s => s.class).filter(cls => cls && cls.trim() !== ''))).sort();

  useEffect(() => {
    fetchScreens();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [screens, searchTerm, filters]);

  const fetchScreens = async () => {
    setLoading(true);
    try {
      console.log('🔍 Iniciando busca por telas...');
      
      // Primeiro, vamos verificar a conexão com o Supabase
      const { data: testData, error: testError } = await supabase
        .from('screens')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('❌ Erro de conexão com Supabase:', testError);
        throw new Error(`Erro de conexão: ${testError.message}`);
      }
      
      console.log('✅ Conexão com Supabase OK');

      // Agora buscar as telas
      const { data, error } = await supabase
        .from('screens')
        .select('id, name, city, state, lat, lng, active, class')
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (error) {
        console.error('❌ Erro na query screens:', error);
        throw new Error(`Erro na consulta: ${error.message}`);
      }

      console.log('📊 Dados retornados:', { 
        total: data?.length || 0, 
        sample: data?.slice(0, 3) 
      });

      if (!data || data.length === 0) {
        console.warn('⚠️ Nenhuma tela encontrada na base de dados');
        toast.error('Nenhuma tela encontrada na base de dados');
        setScreens([]);
        return;
      }

      const mappedScreens: SimpleScreen[] = data.map(screen => ({
        id: String(screen.id),
        name: screen.name || 'Tela sem nome',
        city: screen.city || 'Cidade não informada',
        state: screen.state || 'Estado não informado',
        lat: Number(screen.lat) || 0,
        lng: Number(screen.lng) || 0,
        active: Boolean(screen.active),
        class: screen.class || 'ND'
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

    setFilteredScreens(filtered);
  }, [screens, searchTerm, filters]);

  const handleScreenSelect = (screen: SimpleScreen) => {
    setSelectedScreen(screen);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ city: 'all', status: 'all', class: 'all' });
    setSelectedScreen(null);
  };

  const handleDebug = async () => {
    toast.info('Executando diagnóstico...');
    const result = await runSupabaseDebug();
    
    if (result && typeof result === 'object' && 'authenticated' in result) {
      toast.success('Diagnóstico concluído! Verifique o console para detalhes.');
    } else {
      toast.error('Problemas encontrados no diagnóstico. Verifique o console.');
    }
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
          
          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <strong>Debug:</strong> {screens.length} telas carregadas | 
              Estado: {loading ? 'Carregando...' : 'Pronto'} |
              Filtradas: {filteredScreens.length}
            </div>
          )}
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchScreens}>
                  🔄 Recarregar
                </Button>
                <Button variant="outline" size="sm" onClick={handleDebug}>
                  🔧 Debug
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