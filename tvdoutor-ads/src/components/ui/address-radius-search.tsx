import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Search, Loader2 } from "lucide-react";
import { geocodeAddress } from '@/lib/geocoding';
import { CEPInput } from '@/components/ui/cep-input';
import { toast } from "sonner";
import type { ViaCEPAddress } from '@/lib/viacep-service';

interface AddressRadiusSearchProps {
  onResults: (screens: any[], center: { lat: number; lng: number }, radius: number) => void;
  disabled?: boolean;
}

export const AddressRadiusSearch = ({ onResults, disabled = false }: AddressRadiusSearchProps) => {
  const [searchMode, setSearchMode] = useState<'address' | 'cep'>('address');
  const [address, setAddress] = useState('');
  const [cep, setCep] = useState('');
  const [cepAddressData, setCepAddressData] = useState<ViaCEPAddress | null>(null);
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
    const searchValue = searchMode === 'cep' ? cep : address;
    
    if (!searchValue.trim()) {
      toast.error(`Por favor, digite ${searchMode === 'cep' ? 'um CEP' : 'um endereço'} para buscar`);
      return;
    }

    setLoading(true);

    try {
      console.log('🔍 Iniciando busca geoespacial:', { 
        mode: searchMode,
        value: searchValue, 
        radius: `${radius}km` 
      });

      // Geocodificar o endereço ou CEP
      const geocoded = await geocodeAddress(searchValue);
      if (!geocoded) {
        throw new Error(`${searchMode === 'cep' ? 'CEP' : 'Endereço'} não encontrado. Tente ser mais específico.`);
      }

      console.log('📍 Localização geocodificada:', geocoded);

      // Buscar telas próximas usando a mesma lógica da landing page
      const { searchScreensNearLocation } = await import('@/lib/search-service');
      
      const screens = await searchScreensNearLocation({
        lat: geocoded.lat,
        lng: geocoded.lng,
        startDate: new Date().toISOString().split('T')[0],
        durationWeeks: '2',
        addressName: searchValue,
        formattedAddress: geocoded.google_formatted_address,
        placeId: geocoded.google_place_id,
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

  const handleCEPChange = (value: string, addressData?: ViaCEPAddress | null) => {
    setCep(value);
    if (addressData) {
      setCepAddressData(addressData);
    }
  };

  const isSearchDisabled = () => {
    if (loading || disabled) return true;
    if (searchMode === 'cep') return !cep.trim();
    return !address.trim();
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        Busca por Localização + Raio
      </Label>
      
      <Tabs value={searchMode} onValueChange={(value) => setSearchMode(value as 'address' | 'cep')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="address">Endereço</TabsTrigger>
          <TabsTrigger value="cep">CEP</TabsTrigger>
        </TabsList>
        
        <TabsContent value="address" className="space-y-3 mt-3">
          <p className="text-xs text-muted-foreground">
            Busque por: <strong>Endereço</strong>, <strong>Bairro</strong> ou <strong>Cidade</strong>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Ex: Av Paulista, 1000 ou Bela Vista, SP"
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
        </TabsContent>
        
        <TabsContent value="cep" className="space-y-3 mt-3">
          <p className="text-xs text-muted-foreground">
            Digite o CEP e veja o endereço completo automaticamente
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <CEPInput
                value={cep}
                onChange={handleCEPChange}
                onAddressSelect={(address) => setCepAddressData(address)}
                placeholder="Ex: 01310-100"
                disabled={loading || disabled}
                showValidation={true}
                autoFormat={true}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Raio de Busca</Label>
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
        </TabsContent>
      </Tabs>

      <Button 
        onClick={handleSearch} 
        disabled={isSearchDisabled()}
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







