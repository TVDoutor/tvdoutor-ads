import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, MapPin, X } from "lucide-react";

interface City {
  name: string;
  state: string;
  count: number;
  address?: string;
}

interface CitySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedCities: string[]) => void;
  availableCities: City[];
  selectedCities: string[];
}

export const CitySelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  availableCities,
  selectedCities,
}: CitySelectionModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [tempSelectedCities, setTempSelectedCities] = useState<string[]>(selectedCities);

  const filteredCities = availableCities.filter(city =>
    city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    city.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (city.address && city.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCityToggle = (cityName: string) => {
    setTempSelectedCities(prev =>
      prev.includes(cityName)
        ? prev.filter(c => c !== cityName)
        : [...prev, cityName]
    );
  };

  const handleConfirm = () => {
    onConfirm(tempSelectedCities);
    onClose();
  };

  const handleRemoveCity = (cityName: string) => {
    setTempSelectedCities(prev => prev.filter(c => c !== cityName));
  };

  const handleSelectAll = () => {
    if (tempSelectedCities.length === filteredCities.length) {
      setTempSelectedCities([]);
    } else {
      setTempSelectedCities(filteredCities.map(c => c.name));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Selecionar Cidades
          </DialogTitle>
          <DialogDescription>
            Selecione as cidades que você deseja incluir na proposta. Você pode buscar por nome da cidade, estado ou endereço.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cidade, estado ou endereço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Cidades Selecionadas */}
          {tempSelectedCities.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Cidades Selecionadas ({tempSelectedCities.length})</h4>
              <div className="flex flex-wrap gap-2">
                {tempSelectedCities.map(cityName => {
                  const city = availableCities.find(c => c.name === cityName);
                  return (
                    <Badge key={cityName} variant="default" className="flex items-center gap-1">
                      {cityName}
                      {city && <span className="text-xs opacity-75">({city.count})</span>}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => handleRemoveCity(cityName)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lista de Cidades */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Cidades Disponíveis ({filteredCities.length})
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {tempSelectedCities.length === filteredCities.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
              </Button>
            </div>
            
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              {filteredCities.map(city => (
                <div
                  key={`${city.name}-${city.state}`}
                  className="flex items-center space-x-3 p-3 hover:bg-accent/50 border-b last:border-b-0"
                >
                  <Checkbox
                    id={`city-${city.name}`}
                    checked={tempSelectedCities.includes(city.name)}
                    onCheckedChange={() => handleCityToggle(city.name)}
                  />
                  <label
                    htmlFor={`city-${city.name}`}
                    className="flex-1 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="font-medium">{city.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">{city.state}</span>
                      </div>
                      {city.address && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {city.address}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs ml-2">
                      {city.count} telas
                    </Badge>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={tempSelectedCities.length < 2}
          >
            Confirmar Seleção ({tempSelectedCities.length} cidades)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
