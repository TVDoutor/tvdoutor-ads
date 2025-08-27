import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  MapPin, 
  Building2, 
  Eye,
  AlertCircle,
  Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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



  useEffect(() => {
    fetchVenues();
  }, []);

  useEffect(() => {
    filterVenues();
  }, [searchTerm, venues]);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Buscando pontos de venda do inventário...');

      // Buscar todas as telas do inventário
      const { data: screensData, error } = await supabase
        .from('screens')
        .select(`
          id, code, name, display_name, city, state, class, active, 
          venue_type_parent, venue_type_child, venue_type_grandchildren,
          lat, lng
        `)
        .order('display_name');

      if (error) {
        console.error('❌ Erro ao buscar telas:', error);
        throw error;
      }

      console.log('✅ Telas encontradas:', screensData?.length || 0);

      // Agrupar telas por ponto de venda (usando display_name como identificador do venue)
      const venuesMap = new Map<string, VenueWithScreens>();

      screensData?.forEach(screen => {
        const venueName = screen.display_name || 'Ponto sem nome';
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
          code: screen.code || screen.name || `ID-${screen.id}`,
          name: screen.name || `ID-${screen.id}`,
          display_name: screen.display_name || 'Sem nome',
          class: screen.class || 'ND',
          active: Boolean(screen.active),
          lat: screen.lat,
          lng: screen.lng
        });

        venue.screenCount++;
        if (screen.active) {
          venue.activeScreens++;
        }
        if (screen.lat && screen.lng) {
          venue.coordinates = true;
        }
      });

      const venuesArray = Array.from(venuesMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));

      console.log('✅ Pontos de venda agrupados:', venuesArray.length);
      setVenues(venuesArray);

    } catch (err: any) {
      console.error('💥 Erro ao buscar pontos de venda:', err);
      setError(err.message);
      
      if (err.message?.includes('JWT') || err.message?.includes('auth')) {
        toast({
          title: "Erro de Autenticação",
          description: "Você precisa estar logado para ver os pontos de venda.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os pontos de venda.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filterVenues = () => {
    if (!searchTerm) {
      setFilteredVenues(venues);
      return;
    }

    const filtered = venues.filter(venue =>
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

    setFilteredVenues(filtered);
  };

  const handleViewDetails = (venueId: string) => {
    navigate(`/venues/${venueId}`);
  };

  const getLocationDisplay = (venue: VenueWithScreens) => {
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Pontos de Venda
            </h1>
            <p className="text-muted-foreground">
              Gerencie e visualize todos os pontos de venda e suas telas
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do ponto, tipo, cidade, código de tela..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : venues.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Total de Pontos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-secondary" />
                <div>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : venues.reduce((acc, v) => acc + v.screenCount, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total de Telas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : venues.reduce((acc, v) => acc + v.activeScreens, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Telas Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Venues List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            filteredVenues.map((venue) => (
              <Card key={venue.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{venue.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {getVenueTypeDisplay(venue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={venue.activeScreens > 0 ? "default" : "secondary"}>
                        {venue.activeScreens}/{venue.screenCount} ativas
                      </Badge>
                      {venue.coordinates && (
                        <Badge variant="outline" className="text-xs mt-1">
                          📍 Com coordenadas
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
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

                    <div className="text-xs text-muted-foreground">
                      <strong>{venue.screenCount}</strong> {venue.screenCount === 1 ? 'tela' : 'telas'} no inventário
                    </div>
                    
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => handleViewDetails(venue.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Empty State */}
        {!loading && filteredVenues.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "Nenhum ponto encontrado" : "Nenhuma tela no inventário"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Tente ajustar os termos da busca."
                  : "Os pontos de venda são agrupados automaticamente a partir das telas do inventário."
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Venues;