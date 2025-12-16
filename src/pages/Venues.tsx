// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { isActive } from '@/utils/status';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  MapPin, 
  Building2, 
  Eye,
  AlertCircle,
  Package,
  Grid,
  List,
  Zap,
  ZapOff,
  Filter,
  Target,
  Users,
  BarChart3,
  Layers,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fetchAllScreens } from "@/lib/screen-fallback-service";

interface VenueWithScreens {
  id: string;
  name: string;
  venue_type_parent: string;
  venue_type_child: string;
  city: string;
  state: string;
  screens: {
    id: number;
    code: string;
    name: string;
    display_name: string;
    class: string;
    active: boolean;
    lat?: number;
    lng?: number;
  }[];
  screenCount: number;
  activeScreens: number;
  coordinates: boolean;
}

const Venues = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venues, setVenues] = useState<VenueWithScreens[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<VenueWithScreens[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [typeFilter, setTypeFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isUsingSampleData, setIsUsingSampleData] = useState(false);
  // KPIs de telas — devem bater com o Inventário (base: v_screens_enriched paginada)
  const [screenStats, setScreenStats] = useState({ total: 0, active: 0, inactive: 0, cities: 0 });



  useEffect(() => {
    fetchVenues();
  }, []);

  useEffect(() => {
    filterVenues();
  }, [searchTerm, venues, typeFilter, cityFilter, statusFilter]);

  // Get unique values for filters
  const availableCities = Array.from(new Set(venues.map(v => v.city).filter(Boolean))).sort();
  const availableTypes = Array.from(new Set(venues.map(v => v.venue_type_parent).filter(Boolean))).sort();
  
  // Check if there are venues without city/state/address (Em Branco)
  const hasVenuesWithoutLocation = venues.some(v => 
    !v.city || v.city === 'Cidade não informada' || 
    !v.state || v.state === 'Estado não informado' ||
    v.city?.trim() === '' || v.state?.trim() === ''
  );
  
  // Count venues without location info
  const venuesWithoutLocationCount = venues.filter(v => 
    !v.city || v.city === 'Cidade não informada' || 
    !v.state || v.state === 'Estado não informado' ||
    v.city?.trim() === '' || v.state?.trim() === ''
  ).length;

  const fetchVenues = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Iniciando busca de pontos de venda...');

      // Base oficial (mesma do Inventory): v_screens_enriched pode ter limite de 1000 linhas, então paginamos.
      const fetchScreensInventoryBase = async () => {
        const PAGE_SIZE = 1000;
        let from = 0;
        let all: any[] = [];
        let lastError: any = null;

        while (true) {
          const { data, error } = await supabase
            .from('v_screens_enriched')
            .select(`
              id,
              code,
              name,
              display_name,
              city,
              state,
              class,
              active,
              lat,
              lng
            `)
            .order('code', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);

          if (error) {
            lastError = error;
            break;
          }

          const chunk = (data ?? []) as any[];
          all = all.concat(chunk);
          if (chunk.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        if (lastError) throw lastError;
        return all;
      };

      let data: any[] = [];
      try {
        data = await fetchScreensInventoryBase();
      } catch (e) {
        // Fallback: usar a função utilitária antiga (mantém compatibilidade se a view estiver indisponível)
        console.warn('⚠️ Falha ao buscar v_screens_enriched. Usando fallback fetchAllScreens().', e);
        data = await fetchAllScreens();
      }

      console.log('✅ Dados recebidos:', data?.length || 0);

      if (!data || data.length === 0) {
        console.warn('⚠️ Nenhum dado recebido, mas não é erro crítico');
        setVenues([]);
        setFilteredVenues([]);
        setIsUsingSampleData(false);
        setScreenStats({ total: 0, active: 0, inactive: 0, cities: 0 });
        return;
      }

      // Verificar se são dados de exemplo (IDs baixos indicam dados de exemplo)
      const isSampleData = data.length <= 5 && data.every(item => item.id <= 5);
      setIsUsingSampleData(isSampleData);
      
      if (isSampleData) {
        console.log('ℹ️ Usando dados de exemplo devido a problemas de conectividade');
      }

      // Calcular KPIs de telas (base inventário) antes de aplicar placeholders de cidade/estado.
      try {
        const total = data.length;
        const active = data.filter((s: any) => isActive(s.active)).length;
        const inactive = total - active;
        const cities = new Set(
          data
            .map((s: any) => (s?.city ?? '').toString().trim())
            .filter((c: string) => Boolean(c))
        ).size;
        setScreenStats({ total, active, inactive, cities });
      } catch {
        setScreenStats({ total: data.length, active: 0, inactive: 0, cities: 0 });
      }

      // Agrupar telas por venue
      const venuesMap = new Map<string, VenueWithScreens>();

      data.forEach(screen => {
        // Usar display_name se disponível, senão usar name, senão fallback
        const venueName = screen.display_name || screen.name || 'Ponto sem nome';
        const venueKey = `${venueName}-${screen.city}-${screen.state}`;

        if (!venuesMap.has(venueKey)) {
          venuesMap.set(venueKey, {
            id: venueKey,
            name: venueName,
            venue_type_parent: screen.venue_type_parent || 'Não informado',
            venue_type_child: screen.venue_type_child || '',
            city: screen.city || 'Cidade não informada',
            state: screen.state || 'Estado não informado',
            screens: [],
            screenCount: 0,
            activeScreens: 0,
            coordinates: false
          });
        }

        const venue = venuesMap.get(venueKey)!;
        venue.screens.push({
          id: screen.id,
          code: screen.code || `ID-${screen.id}`,
          name: screen.name || `ID-${screen.id}`,
          display_name: screen.display_name || screen.name || 'Sem nome',
          class: screen.class || 'ND',
          active: Boolean(screen.active),
          lat: screen.lat,
          lng: screen.lng
        });

        venue.screenCount++;
        if (isActive(screen.active)) {
          venue.activeScreens++;
        }
        if (screen.lat && screen.lng) {
          venue.coordinates = true;
        }
      });

      const venuesArray = Array.from(venuesMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));

      console.log('✅ Pontos de venda agrupados:', venuesArray.length);
      console.log('🔍 Primeiro venue com classes:', venuesArray[0] ? {
        name: venuesArray[0].name,
        screens: venuesArray[0].screens.map(s => ({ code: s.code, class: s.class }))
      } : 'Nenhum venue');
      
      setVenues(venuesArray);
      setFilteredVenues(venuesArray);
      
      // Limpar erro se tudo funcionou
      setError(null);
      
    } catch (err: any) {
      console.error('💥 Erro ao buscar pontos de venda:', err);
      
      // Determinar tipo de erro para mensagem mais específica
      let errorMessage = "Não foi possível carregar os pontos de venda.";
      
      if (err.message?.includes('Invalid API key') || err.message?.includes('JWT')) {
        errorMessage = "Chave API inválida. Verifique as configurações do Supabase.";
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = "Erro de conexão. Verifique sua internet.";
      } else if (err.message?.includes('permission') || err.message?.includes('RLS')) {
        errorMessage = "Erro de permissão. Contate o administrador.";
      } else if (err.message?.includes('authentication')) {
        errorMessage = "Erro de autenticação. Faça login novamente.";
      }
      
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterVenues = () => {
    let filtered = venues;

    // Text search
    if (searchTerm.trim()) {
      filtered = filtered.filter(venue =>
        venue.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.venue_type_parent?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.screens.some(screen => 
          screen.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          screen.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          screen.class?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(venue => venue.venue_type_parent === typeFilter);
    }

    // City filter
    if (cityFilter !== 'all') {
      if (cityFilter === 'blank') {
        // Filter venues without city/state/address (Em Branco)
        filtered = filtered.filter(venue => 
          !venue.city || venue.city === 'Cidade não informada' || 
          !venue.state || venue.state === 'Estado não informado' ||
          venue.city?.trim() === '' || venue.state?.trim() === ''
        );
      } else {
        filtered = filtered.filter(venue => venue.city === cityFilter);
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(venue => venue.activeScreens > 0);
      } else {
        filtered = filtered.filter(venue => venue.activeScreens === 0);
      }
    }

    setFilteredVenues(filtered);
  };

  const handleViewDetails = (venueId: string) => {
    navigate(`/venues/${venueId}`);
  };

  const getLocationDisplay = (venue: VenueWithScreens) => {
    if (!venue.city || venue.city === 'Cidade não informada' || 
        !venue.state || venue.state === 'Estado não informado' ||
        venue.city?.trim() === '' || venue.state?.trim() === '') {
      return '📋 Em Branco';
    }
    return `${venue.city}, ${venue.state}`;
  };

  const getClassDisplay = (screens: any[]) => {
    if (!screens.length) return [];
    
    const classes = [...new Set(screens.map(s => s.class).filter(Boolean))];
    return classes.slice(0, 3); // Show max 3 classes
  };

  const getVenueTypeDisplay = (venue: VenueWithScreens) => {
    if (venue.venue_type_parent === 'Não informado') return 'Tipo não informado';
    return venue.venue_type_child 
      ? `${venue.venue_type_parent} - ${venue.venue_type_child}`
      : venue.venue_type_parent;
  };

  if (error && !loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Erro ao Carregar</h3>
                <p className="text-muted-foreground mb-4">
                  Não foi possível carregar os pontos de venda. Verifique sua conexão e tente novamente.
                </p>
                <Button onClick={fetchVenues}>
                  Tentar Novamente
                </Button>
              </CardContent>
            </Card>
          </div>
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
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Pontos de Venda</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Gerencie locais e suas telas • {venues.length} pontos de venda
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="gap-2"
                  >
                    <Grid className="h-4 w-4" />
                    Cards
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="gap-2"
                  >
                    <List className="h-4 w-4" />
                    Tabela
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Banner de dados de exemplo */}
          {isUsingSampleData && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div>
                    <h3 className="font-medium text-amber-800">Dados de Exemplo</h3>
                    <p className="text-sm text-amber-700">
                      Exibindo dados de exemplo devido a problemas de conectividade com o banco de dados. 
                      Verifique as configurações do Supabase para acessar os dados reais.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Total de Pontos</p>
                    <p className="text-3xl font-bold text-blue-900">
                      {loading ? "..." : venues.length}
                    </p>
                    <p className="text-xs text-blue-700">Pontos de venda únicos</p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-lg">
                    <Building2 className="h-8 w-8 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Total de Telas</p>
                    <p className="text-3xl font-bold text-green-900">
                      {loading ? "..." : screenStats.total}
                    </p>
                    <p className="text-xs text-green-700">Todas as telas</p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-lg">
                    <Package className="h-8 w-8 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-800">Telas Ativas</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {loading ? "..." : screenStats.active}
                    </p>
                    <p className="text-xs text-purple-700">Em funcionamento</p>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-lg">
                    <Zap className="h-8 w-8 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-800">Cidades</p>
                    <p className="text-3xl font-bold text-orange-900">
                      {loading ? "..." : screenStats.cities}
                    </p>
                    <p className="text-xs text-orange-700">Diferentes localidades</p>
                  </div>
                  <div className="p-3 bg-orange-200 rounded-lg">
                    <MapPin className="h-8 w-8 text-orange-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Filters */}
          <Card className="bg-gradient-to-r from-gray-50/50 to-blue-50/50 border-l-4 border-l-primary">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                Filtros e Busca
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Busca Geral</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nome do ponto, tipo, cidade, código de tela..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Tipo</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        {availableTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Cidade</label>
                    <Select value={cityFilter} onValueChange={setCityFilter}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as cidades</SelectItem>
                        {availableCities.map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                        {hasVenuesWithoutLocation && (
                          <SelectItem value="blank">
                            📋 Em Branco ({venuesWithoutLocationCount})
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Com telas ativas</SelectItem>
                        <SelectItem value="inactive">Sem telas ativas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Exibindo <strong>{filteredVenues.length}</strong> de <strong>{venues.length}</strong> pontos de venda
                </span>
                <Button variant="outline" size="sm" onClick={fetchVenues} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Recarregar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="space-y-6">
            <TabsContent value="cards">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Card key={index} className="animate-pulse">
                      <CardHeader className="space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-10 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredVenues.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                      <Building2 className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">
                      {searchTerm || typeFilter !== 'all' || cityFilter !== 'all' || statusFilter !== 'all' 
                        ? "Nenhum ponto encontrado" 
                        : "Nenhuma tela no inventário"
                      }
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                      {searchTerm || typeFilter !== 'all' || cityFilter !== 'all' || statusFilter !== 'all'
                        ? "Tente ajustar os filtros ou termos de busca."
                        : "Os pontos de venda são criados automaticamente a partir das telas do inventário."
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredVenues.map((venue) => (
                    <ModernVenueCard 
                      key={venue.id} 
                      venue={venue} 
                      onViewDetails={handleViewDetails}
                      getLocationDisplay={getLocationDisplay}
                      getClassDisplay={getClassDisplay}
                      getVenueTypeDisplay={getVenueTypeDisplay}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="table">
              <Card className="shadow-lg">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-gray-50/50">
                        <tr>
                          <th className="text-left p-4 font-medium text-gray-900">Ponto de Venda</th>
                          <th className="text-left p-4 font-medium text-gray-900">Tipo</th>
                          <th className="text-left p-4 font-medium text-gray-900">Localização</th>
                          <th className="text-left p-4 font-medium text-gray-900">Telas</th>
                          <th className="text-left p-4 font-medium text-gray-900">Status</th>
                          <th className="text-left p-4 font-medium text-gray-900">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredVenues.map((venue) => (
                          <tr key={venue.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4">
                              <div>
                                <div className="font-medium text-gray-900">{venue.name}</div>
                                <div className="text-sm text-gray-500">ID: {venue.id}</div>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              {getVenueTypeDisplay(venue)}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin className="h-4 w-4" />
                                {getLocationDisplay(venue)}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Badge variant={venue.activeScreens > 0 ? "default" : "secondary"} className="text-xs">
                                  {venue.activeScreens}/{venue.screenCount}
                                </Badge>
                                <span className="text-sm text-gray-600">ativas</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {venue.activeScreens > 0 ? (
                                  <Zap className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ZapOff className="h-4 w-4 text-gray-400" />
                                )}
                                <span className={`text-xs font-medium ${
                                  venue.activeScreens > 0 ? 'text-green-700' : 'text-gray-500'
                                }`}>
                                  {venue.activeScreens > 0 ? 'Operacional' : 'Inativo'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleViewDetails(venue.id)}
                                className="gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                Ver
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );

  // Componente de Card Moderno para Venues
  function ModernVenueCard({ 
    venue, 
    onViewDetails, 
    getLocationDisplay, 
    getClassDisplay, 
    getVenueTypeDisplay 
  }: {
    venue: VenueWithScreens;
    onViewDetails: (id: string) => void;
    getLocationDisplay: (venue: VenueWithScreens) => string;
    getClassDisplay: (screens: any[]) => string[];
    getVenueTypeDisplay: (venue: VenueWithScreens) => string;
  }) {
    return (
      <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-primary/20 hover:border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                {venue.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {getVenueTypeDisplay(venue)}
              </p>
            </div>
            <div className="text-right space-y-1">
              <Badge variant={venue.activeScreens > 0 ? "default" : "secondary"} className="text-xs">
                {venue.activeScreens}/{venue.screenCount} ativas
              </Badge>
              {venue.coordinates && (
                <Badge variant="outline" className="text-xs block">
                  📍 Geo
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{getLocationDisplay(venue)}</span>
            </div>
            
            {getClassDisplay(venue.screens).length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Classes:</span>
                {getClassDisplay(venue.screens).map((cls, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {cls}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                <strong>{venue.screenCount}</strong> {venue.screenCount === 1 ? 'tela' : 'telas'}
              </span>
              <div className="flex items-center gap-1">
                {venue.activeScreens > 0 ? (
                  <Zap className="h-3 w-3 text-green-600" />
                ) : (
                  <ZapOff className="h-3 w-3 text-gray-400" />
                )}
                <span className={venue.activeScreens > 0 ? 'text-green-600' : 'text-gray-500'}>
                  {venue.activeScreens > 0 ? 'Operacional' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={() => onViewDetails(venue.id)}
            className="w-full gap-2 mt-4"
            size="sm"
          >
            <Eye className="h-4 w-4" />
            Ver Detalhes
          </Button>
        </CardContent>
      </Card>
    );
  }
};

export default Venues;