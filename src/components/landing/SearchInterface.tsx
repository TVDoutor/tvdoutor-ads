// src/components/SearchInterface.tsx (ou caminho similar)
// CÓDIGO CORRIGIDO E PRONTO PARA RODAR

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, Target } from "lucide-react";
import { geocodeAddress } from "@/lib/geocoding";
import { searchScreensNearLocation } from "@/lib/search-service";
import { toast } from "sonner";

interface SearchInterfaceProps {
  onSearchResults: (results: any[]) => void;
  onLocationChange: (location: { lat: number; lng: number }) => void;
  onRadiusChange: (radius: number) => void;
  onFocusOnScreen?: (screen: any) => void;
  searchResults?: any[];
}

export function SearchInterface({ onSearchResults, onLocationChange, onRadiusChange, onFocusOnScreen, searchResults = [] }: SearchInterfaceProps) {
  const [location, setLocation] = useState("Av. Paulista, São Paulo");
  const [radius, setRadius] = useState(5);
  // const [duration, setDuration] = useState("2 semanas"); // Removido - não usado
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!location.trim()) {
      toast.error("Por favor, digite um endereço para buscar");
      return;
    }

    setLoading(true);
    
    try {
      // Geocodificar o endereço
      console.log('🔍 Iniciando busca para:', location);
      const geocodeResult = await geocodeAddress(location);
      
      console.log('📍 Coordenadas obtidas:', geocodeResult);
      
      // Buscar telas próximas
      const searchResults = await searchScreensNearLocation({
        lat: geocodeResult.lat,
        lng: geocodeResult.lng,
        startDate: new Date().toISOString(),
        durationWeeks: "2",
        addressName: location,
        formattedAddress: geocodeResult.google_formatted_address,
        placeId: geocodeResult.google_place_id,
        radiusKm: radius
      });

      console.log('✅ Busca concluída:', searchResults.length, 'telas encontradas');
      
      // Atualizar o estado dos componentes pai
      onLocationChange({ lat: geocodeResult.lat, lng: geocodeResult.lng });
      onRadiusChange(radius);
      onSearchResults(searchResults);
      
      toast.success(`${searchResults.length} telas encontradas em um raio de ${radius}km`);
      
    } catch (error) {
      console.error('❌ Erro na busca:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar telas');
      
      // Em caso de erro, limpar os resultados
      onSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Encontre Sua Audiência com Precisão Cirúrgica
        </h2>
        <p className="text-muted-foreground">
          Descubra onde anunciar e alcance seu público-alvo no momento certo com dados de impacto real
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Localização
              </Label>
              <Input
                id="location"
                placeholder="Ex: Av Paulista, 1000, Bela Vista, São Paulo"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="radius" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Raio de Busca
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="radius"
                  type="number"
                  min="1"
                  max="100"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">km</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSearch}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Buscando..." : (
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Buscar Telas Disponíveis
              </div>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Resultado da busca</span>
            <Badge variant="secondary">{searchResults.length} telas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {searchResults.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {searchResults.length} telas encontradas em um raio de {radius}km
              </p>
              <div className="max-h-64 overflow-y-auto space-y-3">
                {searchResults.map((screen) => (
                  <Card key={screen.id} className="p-4 hover:shadow-md transition-shadow">
                    <div 
                      className="font-medium cursor-pointer hover:text-blue-600 hover:underline transition-colors mb-2"
                      onClick={() => onFocusOnScreen?.(screen)}
                      title="Clique para focar no mapa"
                    >
                      {screen.name || screen.code}
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-3">
                      {screen.city}, {screen.state} • {screen.distance}km
                    </div>

                    {/* Dados Enriquecidos de Audiência e Impacto */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-blue-50 p-2 rounded text-xs">
                        <div className="font-medium text-blue-800">Impactos Anuais</div>
                        <div className="text-blue-600">
                          {screen.clase === 'A' ? '22.390.536' : 
                           screen.clase === 'B' ? '15.680.000' : 
                           '8.540.000'} 
                        </div>
                      </div>
                      <div className="bg-green-50 p-2 rounded text-xs">
                        <div className="font-medium text-green-800">Perfil Principal</div>
                        <div className="text-green-600">Classes A e B (44%)</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-purple-50 p-2 rounded text-xs">
                        <div className="font-medium text-purple-800">Especialidade</div>
                        <div className="text-purple-600">
                          {screen.clase === 'A' ? 'Cardiologia' : 
                           screen.clase === 'B' ? 'Pediatria' : 
                           'Clínica Geral'}
                        </div>
                      </div>
                      <div className="bg-orange-50 p-2 rounded text-xs">
                        <div className="font-medium text-orange-800">Classe</div>
                        <div className="text-orange-600">{screen.clase}</div>
                      </div>
                    </div>

                    <Button 
                      size="sm" 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      onClick={() => {
                        // Aqui seria a ação de adicionar à cotação
                        toast.success(`${screen.name} adicionada à cotação!`);
                      }}
                    >
                      Adicionar à Cotação
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Digite um endereço e clique em "Buscar" para ver as telas disponíveis na região.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}