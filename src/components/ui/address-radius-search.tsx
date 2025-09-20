import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search, Loader2 } from "lucide-react";
import { geocodeAddress } from '@/lib/geocoding';
import { toast } from "sonner";

interface AddressRadiusSearchProps {
  onResults: (screens: any[], center: { lat: number; lng: number }, radius: number) => void;
  disabled?: boolean;
}

export const AddressRadiusSearch = ({ onResults, disabled = false }: AddressRadiusSearchProps) => {
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState('5');
  const [loading, setLoading] = useState(false);

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
      toast.error("Por favor, digite um endereço para buscar");
      return;
    }

    setLoading(true);

    try {
      console.log('🔍 Iniciando busca geoespacial:', { address, radius: `${radius}km` });

      // Geocodificar o endereço
      const geocoded = await geocodeAddress(address);
      if (!geocoded) {
        throw new Error('Endereço não encontrado. Tente ser mais específico.');
      }

      console.log('📍 Endereço geocodificado:', geocoded);

      // Buscar telas próximas usando a mesma lógica da landing page
      const { searchScreensNearLocation } = await import('@/lib/search-service');
      
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
      
      // Notificar componente pai com os resultados
      onResults(screens, { lat: geocoded.lat, lng: geocoded.lng }, parseInt(radius));
      
      toast.success(`${screens.length} telas encontradas em um raio de ${radius}km`);

    } catch (err) {
      console.error('💥 Erro na busca geoespacial:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao buscar telas');
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
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        Busca por endereço + Raio
      </Label>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Ex: Av Paulista, 1000, São Paulo"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
              disabled={loading || disabled}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Select value={radius} onValueChange={setRadius} disabled={loading || disabled}>
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
        disabled={loading || !address.trim() || disabled}
        size="sm"
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Buscando...
          </>
        ) : (
          <>
            <Search className="w-4 h-4 mr-2" />
            Buscar Telas Próximas
          </>
        )}
      </Button>
    </div>
  );
};





