import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Search, Users, AlertCircle, Play, RefreshCw, Heart, ShoppingCart, Filter, ArrowUpDown, ZoomIn, ZoomOut, EyeOff } from "lucide-react";
import { type ScreenSearchResult, searchScreensNearLocation, searchScreensByCity } from "@/lib/search-service";
import { MapView } from "./MapView";
import { geocodeAddress } from "@/lib/geocoding";

interface HeroSearchSectionProps {
  onSearchResults?: (screens: ScreenSearchResult[]) => void;
  onNavigateToMap?: () => void;
}

export function HeroSearchSection({ onSearchResults }: HeroSearchSectionProps) {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState("location");
  const [address, setAddress] = useState("Av Paulista, São Paulo");
  const [duration, setDuration] = useState("4");
  const [startDate, setStartDate] = useState("01/10/2025");
  const [radius, setRadius] = useState("5");
  const [searchResults, setSearchResults] = useState<ScreenSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: -23.550520, lng: -46.633308 });
  const [error, setError] = useState<string | null>(null);
  const [hideSideMap, setHideSideMap] = useState(false);

  // Função para lidar com o clique em "Adicionar ponto"
  const handleAddPoint = (screen: ScreenSearchResult) => {
    console.log('🎯 Adicionando ponto:', screen.name);
    // Redirecionar para a tela de login
    navigate('/login');
  };

  const handleSearch = async () => {
    if (!address.trim()) {
      setError('Por favor, digite um endereço ou cidade');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResults([]);

    try {
      console.log('🔍 Iniciando busca:', { address, searchType, radius: `${radius}km` });

      let screens: ScreenSearchResult[] = [];
      let center = { lat: -23.550520, lng: -46.633308 }; // Centro padrão de SP

      if (searchType === "location") {
        // Busca por localização específica (geocoding + raio)
        try {
      const geocoded = await geocodeAddress(address);
      if (!geocoded) {
        throw new Error('Endereço não encontrado. Tente ser mais específico.');
      }

      console.log('📍 Endereço geocodificado:', geocoded);
          center = { lat: geocoded.lat, lng: geocoded.lng };
      setMapCenter(center);

      // Buscar telas próximas
          screens = await searchScreensNearLocation({
        lat: geocoded.lat,
        lng: geocoded.lng,
            startDate: startDate,
            durationWeeks: duration,
        addressName: address,
        formattedAddress: geocoded.google_formatted_address,
        placeId: geocoded.google_place_id,
        radiusKm: parseInt(radius)
      });
        } catch (geocodingError) {
          console.warn('⚠️ Erro no geocoding, tentando busca por cidade:', geocodingError);
          // Fallback: buscar por cidade se geocoding falhar
          screens = await searchScreensByCity(address);
        }
      } else {
        // Busca por cidade
        screens = await searchScreensByCity(address);
      }

      console.log(`✅ ${screens.length} telas encontradas`);
      setSearchResults(screens);

      // Notificar componente pai
      if (onSearchResults) {
        onSearchResults(screens);
      }

    } catch (err) {
      console.error('💥 Erro na busca:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar telas');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)} mil`;
    }
    return num.toLocaleString();
  };

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto bg-white">
      {/* Barra de Filtros Superior */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                placeholder="endereço ou região"
                      disabled={loading}
                    />
                  </div>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 semana</SelectItem>
                <SelectItem value="2">2 semanas</SelectItem>
                <SelectItem value="4">4 semanas</SelectItem>
                <SelectItem value="8">8 semanas</SelectItem>
                <SelectItem value="12">12 semanas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={radius} onValueChange={setRadius}>
              <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                <SelectItem value="1">1 km</SelectItem>
                <SelectItem value="2">2 km</SelectItem>
                <SelectItem value="5">5 km</SelectItem>
                <SelectItem value="10">10 km</SelectItem>
                <SelectItem value="20">20 km</SelectItem>
                <SelectItem value="50">50 km</SelectItem>
                      </SelectContent>
                    </Select>
            <Input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="início"
              type="date"
            />
                  </div>
          <div className="flex gap-2">
              <Button 
                onClick={handleSearch}
                disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
              >
                <Search className="w-4 h-4 mr-2" />
              {loading ? "Buscando..." : "Buscar"}
            </Button>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              ordenar
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              filtrar
              </Button>
          </div>
        </div>
        
        {/* Opções de Busca */}
        <div className="mt-4">
          <RadioGroup value={searchType} onValueChange={setSearchType} className="flex gap-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="location" id="location" />
              <Label htmlFor="location">Busca por Localização (raio)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="city" id="city" />
              <Label htmlFor="city">Busca por Cidade</Label>
            </div>
          </RadioGroup>
        </div>

              {error && (
          <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

      {/* Layout Principal - Duas Colunas */}
      <div className="flex h-[calc(100vh-200px)]">
        {/* Coluna Esquerda - Lista de Locais */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {searchResults.length === 0 && !loading ? (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tela encontrada</h3>
                <p className="text-gray-600">Digite um endereço ou cidade e clique em "Buscar" para encontrar telas disponíveis.</p>
              </div>
            ) : (
              searchResults.map((screen) => (
              <Card key={screen.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  {/* Imagem do Local */}
                  <div className="h-48 bg-gradient-to-br from-blue-100 to-slate-200 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-2 bg-blue-600 rounded-full flex items-center justify-center">
                          <MapPin className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">{screen.name}</p>
                      </div>
                    </div>
                    
                    {/* Tags */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {(screen as any).tags?.map((tag: string, tagIndex: number) => (
                        <Badge key={tagIndex} variant="secondary" className="text-xs bg-white/90">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Distância */}
                    <div className="absolute top-3 right-3">
                      <Badge variant="outline" className="bg-white/90 text-xs">
                        {formatDistance(screen.distance)}
                  </Badge>
                </div>
              </div>
              
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Título e Endereço */}
                        <div>
                        <h3 className="font-bold text-lg text-gray-900">{screen.name}</h3>
                        <p className="text-sm text-gray-600">{screen.address_raw}</p>
                        <p className="text-xs text-gray-500">{screen.city}, {screen.state}</p>
                      </div>
                      
                      {/* Métricas */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Play className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="text-gray-600">exibições</p>
                            <p className="font-semibold">{formatNumber(screen.audience * 15)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-green-500" />
                          <div>
                            <p className="text-gray-600">audiência</p>
                            <p className="font-semibold">{formatNumber(screen.audience)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-orange-500" />
                          <div>
                            <p className="text-gray-600">frequência</p>
                            <p className="font-semibold">{Math.round(screen.audience / 200)}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Informações Adicionais */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Código:</p>
                            <p className="font-semibold">{screen.code}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Classe:</p>
                            <p className="font-semibold">{screen.class}</p>
                          </div>
                          {screen.distance > 0 && (
                            <div>
                              <p className="text-gray-600">Distância:</p>
                              <p className="font-semibold">{formatDistance(screen.distance)}</p>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Preço:</p>
                          <p className="font-bold text-lg text-green-600">
                            R$ {screen.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / {duration} semanas
                          </p>
                        </div>
                      </div>
                      
                      {/* Botões de Ação */}
                      <div className="flex items-center gap-2">
                      <Button 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleAddPoint(screen)}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          adicionar ponto
                        </Button>
                        <Button variant="outline" size="icon">
                          <Heart className="w-4 h-4" />
                      </Button>
                      </div>
                    </div>
                  </CardContent>
              </div>
            </Card>
              ))
          )}
          </div>
        </div>

        {/* Coluna Direita - Mapa */}
        <div className={`${hideSideMap ? 'w-0' : 'w-1/2'} transition-all duration-300 relative border-l border-gray-200`}>
          {!hideSideMap && (
            <>
              {/* Controles do Mapa */}
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHideSideMap(true)}
                  className="bg-white/90"
                >
                  <EyeOff className="w-4 h-4 mr-2" />
                  ocultar mapa lateral
                </Button>
                <Button variant="outline" size="sm" className="bg-white/90">
                  ver em mapa
                </Button>
              </div>
              
              {/* Controles de Zoom */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
                <Button variant="outline" size="icon" className="bg-white/90">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="bg-white/90">
                  <ZoomOut className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Barra de Busca no Mapa */}
              <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-10 w-64">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="pesquisar nessa área"
                    className="pl-10 bg-white/90"
                  />
                </div>
              </div>
              
              {/* Mapa */}
              <div className="h-full">
          <MapView
            screens={searchResults}
            centerLat={mapCenter.lat}
            centerLng={mapCenter.lng}
            radiusKm={parseInt(radius)}
            loading={loading}
          />
              </div>
            </>
          )}
        </div>
      </div>
      
    </div>
  );
}
