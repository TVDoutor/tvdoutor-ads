import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  MapPin, 
  Building2, 
  Monitor,
  Package,
  AlertCircle,
  Clock,
  Eye,
  CheckCircle,
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VenueDetail {
  id: number;
  code: string;
  name: string;
  country: string;
  state: string;
  district: string;
  lat: number;
  lng: number;
  created_at: string;
  updated_at: string;
  screens: {
    id: number;
    code: string;
    name: string;
    display_name: string;
    city: string;
    state: string;
    cep: string;
    class: string;
    specialty: string[];
    active: boolean;
    lat: number;
    lng: number;
    facing: string;
    screen_facing: string;
    screen_start_time: string;
    screen_end_time: string;
    asset_url: string;
    venue_type_parent: string;
    venue_type_child: string;
    venue_type_grandchildren: string;
    created_at: string;
    updated_at: string;
  }[];
}

const VenueDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock user - será substituído por autenticação real
  const mockUser = {
    name: "João Silva",
    email: "joao@tvdoutorada.com",
    role: "Admin"
  };

  useEffect(() => {
    if (id) {
      fetchVenueDetails();
    }
  }, [id]);

  const fetchVenueDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_venue_details', {
        venue_id_in: parseInt(id!)
      });

      if (error) {
        throw error;
      }

      setVenue(data as unknown as VenueDetail);
    } catch (err: any) {
      console.error('Error fetching venue details:', err);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                <p className="text-muted-foreground font-mono">
                  {venue?.code || "Código não informado"}
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
                    <label className="text-sm font-medium text-muted-foreground">Nome</label>
                    <p className="text-sm">{venue.name || "Não informado"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Código</label>
                    <p className="text-sm font-mono">{venue.code || "Não informado"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">País</label>
                    <p className="text-sm">{venue.country || "Não informado"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Estado</label>
                    <p className="text-sm">{venue.state || "Não informado"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cidade/Distrito</label>
                    <p className="text-sm">{venue.district || "Não informado"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Coordenadas</label>
                    <p className="text-sm">
                      {venue.lat && venue.lng 
                        ? `${venue.lat.toFixed(6)}, ${venue.lng.toFixed(6)}`
                        : "Não informado"
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Criado em</label>
                    <p className="text-sm">{formatDate(venue.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Atualizado em</label>
                    <p className="text-sm">{formatDate(venue.updated_at)}</p>
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
                              <span className="text-muted-foreground">Localização:</span>
                              <p>{screen.city || "N/A"}, {screen.state || "N/A"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">CEP:</span>
                              <p>{screen.cep || "N/A"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Classe:</span>
                              <p>{screen.class || "N/A"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Direcionamento:</span>
                              <p>{screen.facing || "N/A"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Horário:</span>
                              <p>
                                {screen.screen_start_time && screen.screen_end_time
                                  ? `${screen.screen_start_time} - ${screen.screen_end_time}`
                                  : "N/A"
                                }
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Coordenadas:</span>
                              <p>
                                {screen.lat && screen.lng 
                                  ? `${screen.lat.toFixed(4)}, ${screen.lng.toFixed(4)}`
                                  : "N/A"
                                }
                              </p>
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