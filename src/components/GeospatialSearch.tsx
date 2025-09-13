import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { geocodeAddress } from '@/lib/geocoding';
import { searchScreensNearLocation } from '@/lib/search-service';
import { type ScreenSearchResult } from '@/lib/search-service';

interface GeospatialSearchProps {
  onResults?: (screens: ScreenSearchResult[], center: { lat: number; lng: number }, radius: number) => void;
  onNavigateToMap?: () => void;
}

export function GeospatialSearch({ onResults, onNavigateToMap }: GeospatialSearchProps) {
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState('5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScreenSearchResult[]>([]);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);

  const radiusOptions = [
    { value: '1', label: '1 km' },
    { value: '2', label: '2 km' },
    { value: '5', label: '5 km' },
    { value: '10', label: '10 km' },
    { value: '20', label: '20 km' },
    { value: '50', label: '50 km' }
  ];

  const handleSearch = async () => {
    if (!address.trim()) {
      setError('Por favor, digite um endereço ou cidade');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      console.log('🔍 Iniciando busca geoespacial:', { address, radius: `${radius}km` });

      // Geocodificar endereço
      const geocoded = await geocodeAddress(address);
      if (!geocoded) {
        throw new Error('Endereço não encontrado. Tente ser mais específico.');
      }

      console.log('📍 Endereço geocodificado:', geocoded);
      setCenter({ lat: geocoded.lat, lng: geocoded.lng });

      // Buscar telas próximas
      const screens = await searchScreensNearLocation({
        lat: geocoded.lat,
        lng: geocoded.lng,
        startDate: new Date().toISOString().split('T')[0],
        durationWeeks: '2',
        addressName: address,
        formattedAddress: geocoded.formatted_address,
        placeId: geocoded.place_id,
        radiusKm: parseInt(radius)
      });

      console.log(`✅ ${screens.length} telas encontradas em ${radius}km de raio`);
      setResults(screens);

      // Notificar componente pai
      if (onResults) {
        onResults(screens, { lat: geocoded.lat, lng: geocoded.lng }, parseInt(radius));
      }

    } catch (err) {
      console.error('💥 Erro na busca geoespacial:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar telas');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="address">Endereço ou Cidade</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="address"
              placeholder="Ex: Av Paulista, 1000, São Paulo"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="radius">Raio de Busca</Label>
          <Select value={radius} onValueChange={setRadius} disabled={loading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {radiusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button 
        onClick={handleSearch} 
        disabled={loading || !address.trim()}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Buscando telas...
          </>
        ) : (
          <>
            <Search className="w-4 h-4 mr-2" />
            Buscar Telas Próximas
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {results.length} {results.length === 1 ? 'tela encontrada' : 'telas encontradas'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.slice(0, 3).map((screen, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {screen.class.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{screen.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {screen.city}, {screen.state} • {screen.distance}km
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">R$ {screen.price.toFixed(2)}/semana</p>
                    <p className="text-xs text-muted-foreground">
                      {screen.reach.toLocaleString()} pessoas/semana
                    </p>
                  </div>
                </div>
              ))}
              
              {results.length > 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{results.length - 3} telas adicionais
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onNavigateToMap}
                  className="flex-1"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Ver no Mapa
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    // Aqui você pode implementar uma ação para ver todas as telas
                    console.log('Ver todas as telas:', results);
                  }}
                  className="flex-1"
                >
                  Ver Todas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && results.length === 0 && address && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhuma tela encontrada em {radius}km de "{address}". 
            Tente aumentar o raio de busca ou verificar o endereço.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
