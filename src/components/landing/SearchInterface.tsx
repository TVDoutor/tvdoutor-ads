import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Search, Target } from "lucide-react";

interface SearchInterfaceProps {
  onSearchResults: (results: any[]) => void;
  onLocationChange: (location: { lat: number; lng: number }) => void;
  onRadiusChange: (radius: number) => void;
}

export function SearchInterface({ onSearchResults, onLocationChange, onRadiusChange }: SearchInterfaceProps) {
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(5);
  const [duration, setDuration] = useState("2 semanas");
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    setLoading(true);
    // Simular busca
    setTimeout(() => {
      onLocationChange({ lat: -23.550520, lng: -46.633308 });
      onRadiusChange(radius);
      onSearchResults([
        { id: 1, display_name: "Tela A", city: "São Paulo", state: "SP", distance: 2.5, class: "A", reach: 5000, price: 500 },
        { id: 2, display_name: "Tela B", city: "São Paulo", state: "SP", distance: 3.2, class: "B", reach: 3000, price: 300 }
      ]);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Encontre as Melhores Telas para Sua Campanha
        </h2>
        <p className="text-muted-foreground">
          Descubra onde anunciar e alcance seu público-alvo no momento certo
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
            <Badge variant="secondary">20 telas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Digite um endereço e clique em "Buscar" para ver as telas disponíveis na região.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}