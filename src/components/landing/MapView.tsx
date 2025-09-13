import { Card, CardContent } from '@/components/ui/card';

interface MapViewProps {
  screens: any[];
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  loading?: boolean;
}

export function MapView({ screens, centerLat, centerLng, radiusKm }: MapViewProps) {
  return (
    <Card className="h-full">
      <CardContent className="p-0 h-full relative">
        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex items-center justify-center">
          <div className="text-center p-8">
            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
              <h3 className="font-semibold text-sm mb-1">
                Mostrar um Google Maps com o resultado no raio escolhido pelo usuário
              </h3>
              <p className="text-xs text-muted-foreground">
                {screens.length} telas encontradas em um raio de {radiusKm}km
              </p>
            </div>
            
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold mb-2">Mapa Interativo</h3>
            <p className="text-sm text-muted-foreground">
              O mapa será exibido aqui com as telas encontradas<br/>
              Centro: {centerLat.toFixed(4)}, {centerLng.toFixed(4)}<br/>
              Raio: {radiusKm}km
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}