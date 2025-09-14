import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Building2, 
  Monitor,
  Package,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VenueDetail {
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
    venue_type_parent: string;
    venue_type_child: string;
    venue_type_grandchildren: string;
    specialty: string[];
    address_raw: string;
  }[];
  screenCount: number;
  activeScreens: number;
  coordinates: boolean;
}

const VenueDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    if (id) {
      fetchVenueDetails();
    }
  }, [id]);

  const fetchVenueDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Buscando detalhes do ponto:', id);

      if (!id) {
        throw new Error('ID do ponto não fornecido');
      }

      // Extrair o nome do venue do ID (formato: "nome-cidade-estado")
      const venueName = id.split('-')[0];
      
      // Buscar todas as telas que pertencem a este venue
      // Tentar buscar com a coluna class primeiro, se falhar, buscar sem ela
      let { data: screensData, error } = await supabase
        .from('screens')
        .select(`
          id, code, name, display_name, city, state, class, active,
          venue_type_parent, venue_type_child, venue_type_grandchildren,
          lat, lng, specialty, address_raw
        `);

      // Se a coluna class não existir, buscar novamente sem ela
      if (error && error.code === '42703' && error.message.includes('column screens.class does not exist')) {
        console.log('⚠️ Coluna class não existe, buscando sem ela...');
        const { data: screensWithoutClass, error: errorWithoutClass } = await supabase
          .from('screens')
          .select(`
            id, code, name, display_name, city, state, active,
            venue_type_parent, venue_type_child, venue_type_grandchildren,
            lat, lng, specialty, address_raw
          `);
        
        screensData = screensWithoutClass?.map(screen => ({ ...screen, class: 'ND' })) || null;
        error = errorWithoutClass;
      }

      // Aplicar filtros se não houve erro
      if (!error && screensData) {
        screensData = screensData
          .filter(screen => screen.display_name?.toLowerCase().includes(venueName.toLowerCase()))
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }

      if (error) {
        console.error('❌ Erro ao buscar telas:', error);
        throw error;
      }

      if (!screensData || screensData.length === 0) {
        throw new Error('Ponto de venda não encontrado');
      }

      console.log('✅ Telas encontradas:', screensData.length);

      // Construir objeto do venue
      const firstScreen = screensData[0];
      const venueDetail: VenueDetail = {
        id: id,
        name: firstScreen.display_name || 'Ponto sem nome',
        venue_type_parent: firstScreen.venue_type_parent || 'Não informado',
        venue_type_child: firstScreen.venue_type_child || '',
        city: firstScreen.city || 'Cidade não informada',
        state: firstScreen.state || 'Estado não informado',
        screens: screensData.map(screen => ({
          id: screen.id,
          code: screen.code || screen.name || `ID-${screen.id}`,
          name: screen.name || `ID-${screen.id}`,
          display_name: screen.display_name || 'Sem nome',
          class: screen.class || 'ND',
          active: Boolean(screen.active),
          lat: screen.lat,
          lng: screen.lng,
          venue_type_parent: screen.venue_type_parent || 'Não informado',
          venue_type_child: screen.venue_type_child || '',
          venue_type_grandchildren: screen.venue_type_grandchildren || '',
          specialty: screen.specialty || [],
          address_raw: screen.address_raw || ''
        })),
        screenCount: screensData.length,
        activeScreens: screensData.filter(s => s.active).length,
        coordinates: screensData.some(s => s.lat && s.lng)
      };

      setVenue(venueDetail);
    } catch (err: any) {
      console.error('💥 Erro ao buscar detalhes do ponto:', err);
      setError(err.message);
      
      if (err.message?.includes('JWT') || err.message?.includes('auth')) {
        toast({
          title: "Erro de Autenticação",
          description: "Você precisa estar logado para ver os detalhes do ponto.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os detalhes do ponto de venda.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/venues');
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
                  Não foi possível carregar os detalhes do ponto de venda.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={handleBack}>
                    Voltar
                  </Button>
                  <Button onClick={fetchVenueDetails}>
                    Tentar Novamente
                  </Button>
                </div>
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
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  {venue?.name || "Ponto de Venda"}
                </h1>
                <p className="text-muted-foreground">
                  {venue?.venue_type_parent}{venue?.venue_type_child ? ` - ${venue.venue_type_child}` : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <Skeleton className="h-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32" />
              </CardContent>
            </Card>
          </div>
        ) : venue ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{venue.screens?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Total de Telas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {venue.screens?.filter(s => s.active).length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Telas Ativas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {venue.screens?.filter(s => !s.active).length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Telas Inativas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Venue Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Informações do Ponto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nome do Ponto</label>
                    <p className="text-sm">{venue.name || "Não informado"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tipo Principal</label>
                    <p className="text-sm">{venue.venue_type_parent || "Não informado"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Subtipo</label>
                    <p className="text-sm">{venue.venue_type_child || "Não informado"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Localização</label>
                    <p className="text-sm">{venue.city}, {venue.state}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total de Telas</label>
                    <p className="text-sm">{venue.screenCount}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Coordenadas</label>
                    <p className="text-sm">
                      {venue.coordinates 
                        ? "✅ Algumas telas possuem coordenadas"
                        : "❌ Nenhuma tela possui coordenadas"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Screens List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Telas ({venue.screens?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {venue.screens && venue.screens.length > 0 ? (
                  <div className="space-y-4">
                    {venue.screens.map((screen) => (
                      <Card key={screen.id} className="border-l-4 border-l-primary/20">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-medium">
                                {screen.name || screen.display_name || "Tela sem nome"}
                              </h4>
                              <p className="text-sm text-muted-foreground font-mono">
                                {screen.code || "Código não informado"}
                              </p>
                            </div>
                            <Badge variant={screen.active ? "default" : "secondary"}>
                              {screen.active ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Código:</span>
                              <p className="font-mono">{screen.code}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Classe:</span>
                              <p>{screen.class}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tipo Principal:</span>
                              <p>{screen.venue_type_parent}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Subtipo:</span>
                              <p>{screen.venue_type_child || "N/A"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Coordenadas:</span>
                              <p>
                                {screen.lat && screen.lng 
                                  ? `${screen.lat.toFixed(6)}, ${screen.lng.toFixed(6)}`
                                  : "❌ Não informado"
                                }
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Endereço:</span>
                              <p>{screen.address_raw || "N/A"}</p>
                            </div>
                          </div>
                          
                          {screen.specialty && screen.specialty.length > 0 && (
                            <div className="mt-3">
                              <span className="text-sm text-muted-foreground">Especialidades:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {screen.specialty.map((spec, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {spec}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma tela cadastrada</h3>
                    <p className="text-muted-foreground">
                      Este ponto de venda ainda não possui telas cadastradas.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default VenueDetails;