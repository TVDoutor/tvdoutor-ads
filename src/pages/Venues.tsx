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
  id: number;
  code: string;
  name: string;
  screens: {
    city: string;
    state: string;
    cep: string;
    class: string;
    specialty: string[];
    active: boolean;
  }[];
  screenCount: number;
  activeScreens: number;
}

const Venues = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venues, setVenues] = useState<VenueWithScreens[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<VenueWithScreens[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Mock user - será substituído por autenticação real
  const mockUser = {
    name: "João Silva",
    email: "joao@tvdoutorada.com",
    role: "Admin"
  };

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

      const { data, error } = await supabase.rpc('list_venue_summaries', {
        search: searchTerm.trim() || null,
        limit_count: 50,
        offset_count: 0
      });

      if (error) {
        throw error;
      }

      const venuesWithStats = data?.map(venue => ({
        id: venue.venue_id,
        code: venue.venue_code,
        name: venue.venue_name,
        screens: [{
          city: venue.city,
          state: venue.state,
          cep: venue.cep,
          class: venue.class,
          specialty: venue.specialty,
          active: venue.active
        }],
        screenCount: venue.screens_count,
        activeScreens: venue.active ? venue.screens_count : 0
      })) || [];

      setVenues(venuesWithStats);
    } catch (err: any) {
      console.error('Error fetching venues:', err);
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
      venue.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venue.screens.some(screen => 
        screen.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        screen.state?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    setFilteredVenues(filtered);
  };

  const handleViewDetails = (venueId: number) => {
    navigate(`/venues/${venueId}`);
  };

  const getLocationDisplay = (screens: any[]) => {
    if (!screens.length) return "Localização não informada";
    
    const cities = [...new Set(screens.map(s => s.city).filter(Boolean))];
    const states = [...new Set(screens.map(s => s.state).filter(Boolean))];
    
    if (cities.length && states.length) {
      return `${cities[0]}${cities.length > 1 ? ` (+${cities.length - 1})` : ''}, ${states[0]}`;
    }
    
    return "Localização não informada";
  };

  const getClassDisplay = (screens: any[]) => {
    if (!screens.length) return [];
    
    const classes = [...new Set(screens.map(s => s.class).filter(Boolean))];
    return classes.slice(0, 3); // Show max 3 classes
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
                  placeholder="Buscar por nome, código, cidade ou estado..."
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
                      <p className="text-sm text-muted-foreground font-mono">
                        {venue.code || "Código não informado"}
                      </p>
                    </div>
                    <Badge variant={venue.activeScreens > 0 ? "default" : "secondary"}>
                      {venue.activeScreens}/{venue.screenCount} ativas
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{getLocationDisplay(venue.screens)}</span>
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
                {searchTerm ? "Nenhum ponto encontrado" : "Nenhum ponto cadastrado"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Tente ajustar os termos da busca."
                  : "Quando houver pontos de venda cadastrados, eles aparecerão aqui."
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