import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, Clock, Search, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { searchScreensNearLocation, type ScreenSearchResult } from '@/lib/search-service';
import { searchLocations, getPopularCities, type LocationOption } from '@/lib/location-service';
import { SearchResultsPreview } from './SearchResultsPreview';
import { Autocomplete, type AutocompleteOption } from '@/components/ui/autocomplete';

interface AddressObject {
  name: string;
  lat: number;
  lng: number;
  formatted_address: string;
  place_id: string;
}

export function SearchForm() {
  const navigate = useNavigate();
  const [address, setAddress] = useState<AddressObject | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState('2');
  const [radius, setRadius] = useState('5');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ScreenSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [autocompleteOptions, setAutocompleteOptions] = useState<AutocompleteOption[]>([]);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [popularCities, setPopularCities] = useState<AutocompleteOption[]>([]);

  // Buscar cidades populares ao carregar o componente
  useEffect(() => {
    const loadPopularCities = async () => {
      try {
        const cities = await getPopularCities(6);
        const popularOptions: AutocompleteOption[] = cities.map(city => ({
          id: city.id,
          name: city.name,
          displayText: city.displayText,
          type: city.type
        }));
        setPopularCities(popularOptions);
      } catch (error) {
        console.error('Erro ao carregar cidades populares:', error);
      }
    };

    loadPopularCities();
  }, []);

  // Buscar localizações reais do banco de dados
  const handleAddressSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setAutocompleteOptions([]);
      return;
    }

    setAutocompleteLoading(true);
    try {
      const locations = await searchLocations(query);
      const options: AutocompleteOption[] = locations.map(location => ({
        id: location.id,
        name: location.name,
        displayText: location.displayText,
        type: location.type
      }));
      setAutocompleteOptions(options);
    } catch (error) {
      console.error('Erro na busca de localizações:', error);
      setAutocompleteOptions([]);
    } finally {
      setAutocompleteLoading(false);
    }
  }, []);

  const handleSearch = async () => {
    if (!address) {
      toast.error('Por favor, selecione um endereço.');
      return;
    }

    navigateToResults();
  };

  const navigateToResults = () => {
    if (!address) return;

    // Constrói a URL com os parâmetros da busca
    const query = new URLSearchParams({
      lat: address.lat.toString(),
      lng: address.lng.toString(),
      startDate: startDate || new Date().toISOString().split('T')[0],
      durationWeeks: duration,
      radiusKm: radius,
      addressName: address.name,
      formattedAddress: address.formatted_address,
      placeId: address.place_id
    }).toString();

    // Redireciona para a página de resultados
    navigate(`/resultados?${query}`);
  };

  const handleAddressInputChange = (value: string) => {
    setAddressInput(value);
    handleAddressSearch(value);
    
    if (value.length < 2) {
      setShowResults(false);
      setSearchResults([]);
    }
  };

  const handleAddressSelect = async (option: AutocompleteOption) => {
    try {
      // Para endereços geocodificados, usar os dados diretamente
      if (option.type === 'geocoded') {
        // Extrair dados do ID geocodificado (formato: geocoded-{place_id})
        const placeId = option.id.replace('geocoded-', '');
        
        // Buscar a localização geocodificada novamente para obter os dados completos
        const geocodedLocations = await searchLocations(option.name);
        const geocodedLocation = geocodedLocations.find(loc => loc.id === option.id);
        
        if (geocodedLocation) {
          const newAddress = {
            name: geocodedLocation.displayText,
            lat: geocodedLocation.lat,
            lng: geocodedLocation.lng,
            formatted_address: geocodedLocation.fullAddress,
            place_id: placeId
          };
          
          setAddress(newAddress);
          
          // Fazer busca automática
          const defaultStartDate = startDate || new Date().toISOString().split('T')[0];
          const defaultDuration = duration || '2';
          const currentRadius = parseInt(radius) || 5;
          
          await performSearch(newAddress, defaultStartDate, defaultDuration, currentRadius);
        }
        return;
      }
      
      // Para outros tipos de localização, usar a função existente
      const selectedLocation = await findLocationById(option.id);
      if (selectedLocation) {
        const newAddress = {
          name: selectedLocation.displayText,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          formatted_address: selectedLocation.fullAddress,
          place_id: selectedLocation.id
        };
        
        setAddress(newAddress);
        
        // Fazer busca automática
        const defaultStartDate = startDate || new Date().toISOString().split('T')[0];
        const defaultDuration = duration || '2';
        const currentRadius = parseInt(radius) || 5;
        
        await performSearch(newAddress, defaultStartDate, defaultDuration, currentRadius);
      }
    } catch (error) {
      console.error('Erro ao selecionar endereço:', error);
      toast.error('Erro ao selecionar endereço. Tente novamente.');
    }
  };

  const findLocationById = async (id: string): Promise<LocationOption | null> => {
    try {
      // Para IDs de endereços geocodificados, não precisamos fazer nova busca
      if (id.startsWith('geocoded-')) {
        // Retornar null para IDs geocodificados, pois eles já foram processados
        return null;
      }
      
      // Para outros tipos de ID, fazer busca
      const searchTerm = id.split('-')[0]; // Extrair parte do ID
      if (searchTerm.length < 2) {
        return null;
      }
      
      const locations = await searchLocations(searchTerm);
      if (Array.isArray(locations)) {
        return locations.find(loc => loc.id === id) || null;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar localização por ID:', error);
      return null;
    }
  };

  const performSearch = async (selectedAddress: AddressObject, date: string, durationWeeks: string, radiusKm: number = 5) => {
    setSearchLoading(true);
    try {
      const searchParams = {
        lat: selectedAddress.lat,
        lng: selectedAddress.lng,
        startDate: date,
        durationWeeks: durationWeeks,
        radiusKm: radiusKm,
        addressName: selectedAddress.name,
        formattedAddress: selectedAddress.formatted_address,
        placeId: selectedAddress.place_id
      };

      console.log('🔍 Busca automática iniciada:', searchParams);
      const results = await searchScreensNearLocation(searchParams);
      
      setSearchResults(results);
      setShowResults(true);
      
      if (results.length > 0) {
        toast.success(`${results.length} telas encontradas em ${radiusKm}km!`);
      } else {
        toast.info(`Nenhuma tela encontrada em ${radiusKm}km do endereço. Tente aumentar o raio.`);
      }
    } catch (error) {
      console.error('Erro na busca automática:', error);
      toast.error('Erro ao buscar telas. Tente novamente.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Buscar automaticamente quando a duração ou raio mudar (se já há um endereço selecionado)
  useEffect(() => {
    if (address && showResults) {
      const defaultStartDate = startDate || new Date().toISOString().split('T')[0];
      const defaultDuration = duration || '2';
      const currentRadius = parseInt(radius) || 5;
      
      performSearch(address, defaultStartDate, defaultDuration, currentRadius);
    }
  }, [duration, radius]);

  // Buscar automaticamente quando o endereço for selecionado (sem depender de showResults)
  useEffect(() => {
    if (address) {
      const defaultStartDate = startDate || new Date().toISOString().split('T')[0];
      const defaultDuration = duration || '2';
      const currentRadius = parseInt(radius) || 5;
      
      performSearch(address, defaultStartDate, defaultDuration, currentRadius);
    }
  }, [address]);

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Encontre as Melhores Telas para Sua Campanha
              </h2>
              <p className="text-muted-foreground">
                Descubra onde anunciar e alcance seu público-alvo no momento certo
              </p>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Campo de Endereço com Autocomplete */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Localização
              </label>
              <Autocomplete
                value={addressInput}
                onChange={handleAddressInputChange}
                onSelect={handleAddressSelect}
                options={autocompleteOptions}
                loading={autocompleteLoading}
                placeholder="Ex: Av Paulista, 1000, Bela Vista, São Paulo"
                className="w-full"
              />
              {address && (
                <div className="space-y-1">
                  <p className="text-xs text-primary">
                    ✓ {address.name}
                  </p>
                  {showResults && (
                    <p className="text-xs text-green-600">
                      🔍 Busca automática ativa - {searchResults.length} telas encontradas
                    </p>
                  )}
                </div>
              )}
              {addressInput.length === 0 && popularCities.length > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">Cidades populares:</p>
                  <div className="flex flex-wrap gap-1">
                    {popularCities.slice(0, 3).map(city => (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => handleAddressSelect(city)}
                        className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded transition-colors"
                      >
                        {city.displayText}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                    💡 <strong>Dica:</strong> Digite endereços completos como "Av Paulista, 1000, Bela Vista, São Paulo" e veja as telas disponíveis automaticamente!
                  </div>
                  {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
                    <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border-l-2 border-amber-200">
                      ⚠️ <strong>Configuração:</strong> Para usar endereços específicos, configure a chave da API do Google Maps. Veja CONFIGURACAO_API_GOOGLE.md
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Campo de Data */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data de Início
              </label>
              <div className="relative">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10"
                  min={new Date().toISOString().split('T')[0]}
                />
                <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Campo de Duração */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duração
              </label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a duração" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 semana</SelectItem>
                  <SelectItem value="2">2 semanas</SelectItem>
                  <SelectItem value="4">1 mês</SelectItem>
                  <SelectItem value="8">2 meses</SelectItem>
                  <SelectItem value="12">3 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo de Raio */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Raio de Busca
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="pr-8"
                  placeholder="5"
                />
                <span className="absolute right-3 top-3 text-xs text-muted-foreground">
                  km
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Padrão: 5km (1-100km)
              </p>
            </div>
          </div>

          {/* Botão de Busca */}
          <div className="text-center">
            <Button 
              onClick={handleSearch}
              disabled={loading || !address}
              size="lg"
              className="medical-gradient text-primary-foreground hover:opacity-90 transition-opacity px-8"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Buscar Telas Disponíveis
                </>
              )}
            </Button>
          </div>

          {/* Informações adicionais */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              🔍 Busca automática - telas aparecem ao digitar o endereço
              <br />
              📊 Preços e disponibilidade em tempo real
              <br />
              💡 Sem compromisso - explore antes de se cadastrar
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Resultados da busca em tempo real */}
    {showResults && (
      <div className="mt-8">
        <SearchResultsPreview 
          screens={searchResults}
          loading={searchLoading}
          onAddToCart={(screenId) => {
            // TODO: Implementar gatilho de autenticação
            toast.info(`Funcionalidade "Adicionar ao carrinho" será implementada na próxima etapa!`);
          }}
          onViewAllScreens={navigateToResults}
          searchParams={address ? {
            lat: address.lat,
            lng: address.lng,
            startDate: startDate || new Date().toISOString().split('T')[0],
            durationWeeks: duration,
            addressName: address.name,
            radiusKm: parseInt(radius)
          } : undefined}
        />
      </div>
    )}
  </>
  );
}
