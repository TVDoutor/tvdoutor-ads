import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Monitor, Users, CheckCircle2, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { ProposalData } from "../NewProposalWizard";
import { toast } from "sonner";

interface Screen {
  id: number;
  name: string;
  city: string;
  state: string;
  active: boolean;
  venue_id?: number;
  class: string;
  lat?: number;
  lng?: number;
}

interface ScreenSelectionStepProps {
  data: ProposalData;
  onUpdate: (updates: Partial<ProposalData>) => void;
}

export const ScreenSelectionStep = ({ data, onUpdate }: ScreenSelectionStepProps) => {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("");

  useEffect(() => {
    fetchScreens();
  }, []);

  const fetchScreens = async () => {
    try {
      setLoading(true);
      // Tentar buscar com a coluna class primeiro, se falhar, buscar sem ela
      let { data: screensData, error } = await supabase
        .from('screens')
        .select('id, name, city, state, active, venue_id, class, lat, lng')
        .eq('active', true)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .order('city');

      // Se a coluna class não existir, buscar novamente sem ela
      if (error && error.code === '42703' && error.message.includes('column screens.class does not exist')) {
        console.log('⚠️ Coluna class não existe, buscando sem ela...');
        const { data: screensWithoutClass, error: errorWithoutClass } = await supabase
          .from('screens')
          .select('id, name, city, state, active, venue_id, lat, lng')
          .eq('active', true)
          .not('lat', 'is', null)
          .not('lng', 'is', null)
          .order('city');
        
        screensData = screensWithoutClass?.map(screen => ({ ...screen, class: 'ND' })) || null;
        error = errorWithoutClass;
      }

      if (error) throw error;

      setScreens(screensData || []);
    } catch (error: any) {
      console.error('Erro ao buscar telas:', error);
      toast.error('Erro ao carregar telas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredScreens = screens.filter(screen => {
    const matchesSearch = !searchTerm || 
      screen.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      screen.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      screen.state.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = !selectedCity || screen.city === selectedCity;
    
    return matchesSearch && matchesCity;
  });

  const availableCities = [...new Set(screens.map(s => s.city))].sort();

  const toggleScreenSelection = (screenId: number) => {
    const currentSelected = data.selectedScreens;
    const newSelected = currentSelected.includes(screenId)
      ? currentSelected.filter(id => id !== screenId)
      : [...currentSelected, screenId];
    
    onUpdate({ selectedScreens: newSelected });
  };

  const getSelectedScreensByLocation = () => {
    const selectedScreensData = screens.filter(s => data.selectedScreens.includes(s.id));
    const locationMap: { [key: string]: Screen[] } = {};
    
    selectedScreensData.forEach(screen => {
      const location = `${screen.city}, ${screen.state}`;
      if (!locationMap[location]) {
        locationMap[location] = [];
      }
      locationMap[location].push(screen);
    });
    
    return locationMap;
  };

  const selectedScreensByLocation = getSelectedScreensByLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando telas disponíveis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Buscar telas</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nome, cidade ou estado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Filtrar por cidade</label>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="">Todas as cidades</option>
            {availableCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumo da Seleção */}
      {data.selectedScreens.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              Telas Selecionadas ({data.selectedScreens.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(selectedScreensByLocation).map(([location, locationScreens]) => (
                <div key={location}>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">{location}</span>
                    <Badge variant="secondary">{locationScreens.length} telas</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                    {locationScreens.map(screen => (
                      <div key={screen.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <span className="text-sm">{screen.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleScreenSelection(screen.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Telas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Telas Disponíveis ({filteredScreens.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredScreens.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma tela encontrada com os filtros aplicados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {filteredScreens.map(screen => {
                const isSelected = data.selectedScreens.includes(screen.id);
                
                return (
                  <Card
                    key={screen.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected 
                        ? 'ring-2 ring-primary border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleScreenSelection(screen.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm truncate">{screen.name}</h4>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>{screen.city}, {screen.state}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Classe {screen.class}
                        </Badge>
                        {screen.venue_id && (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            Venue
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {data.selectedScreens.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-700 text-sm">
            ⚠️ Selecione pelo menos uma tela para continuar.
          </p>
        </div>
      )}
    </div>
  );
};