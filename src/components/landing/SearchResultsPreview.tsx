// src/components/SearchResultsPreview.tsx (ou caminho similar)
// CÓDIGO CORRIGIDO E PRONTO PARA RODAR

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Zap, Users } from 'lucide-react';
import { type ScreenSearchResult } from '@/lib/search-service';

interface SearchResultsPreviewProps {
  screens: ScreenSearchResult[];
  loading: boolean;
  onAddToCart: (screenId: string) => void;
  onViewAllScreens?: () => void;
  searchParams?: {
    lat: number;
    lng: number;
    startDate: string;
    durationWeeks: string;
    addressName: string;
    radiusKm?: number;
  };
}

export function SearchResultsPreview({ screens, loading, onAddToCart, onViewAllScreens, searchParams }: SearchResultsPreviewProps) {
  const getClassColor = (classType: string) => {
    const colors: Record<string, string> = {
      'A': 'bg-green-100 text-green-800',
      'AB': 'bg-blue-100 text-blue-800',
      'B': 'bg-yellow-100 text-yellow-800',
      'C': 'bg-orange-100 text-orange-800',
      'D': 'bg-red-100 text-red-800'
    };
    return colors[classType] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Buscando telas disponíveis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (screens.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <MapPin className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhuma tela encontrada
          </h3>
          <p className="text-muted-foreground mb-4">
            Não encontramos telas disponíveis na região selecionada.
          </p>
          <p className="text-sm text-muted-foreground">
            Tente aumentar o raio de busca ou escolher outra localização.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Seção 02 - Resultado da busca */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  {screens.length} telas encontradas
                </h3>
                <p className="text-muted-foreground">
                  Telas disponíveis próximas à localização selecionada
                </p>
              </div>
              <Badge variant="secondary" className="text-sm bg-blue-100 text-blue-800">
                Raio: {searchParams?.radiusKm || 5}km
              </Badge>
            </div>
          </div>
        </div>

        {/* Grid de telas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {screens.slice(0, 6).map((screen) => (
            <Card key={screen.id} className="hover:shadow-lg transition-all duration-200 border border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2 text-foreground">
                      {screen.code} {screen.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {screen.city}, {screen.state}
                      </span>
                      {screen.distance > 0 && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                          {screen.distance}km
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Badge className={`${getClassColor(screen.class)} text-xs`}>
                    Classe {screen.class}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                      <Users className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Alcance</p>
                      <p className="text-sm text-muted-foreground">
                        {screen.reach.toLocaleString()} pessoas/semana
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      <Zap className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Preço</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {screen.price.toFixed(2)}/semana
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-100">
                  <Button 
                    onClick={() => onAddToCart(screen.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    size="sm"
                  >
                    Adicionar ao Carrinho
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Botão para ver todas as telas se houver mais de 6 */}
        {screens.length > 6 && (
          <div className="text-center mt-8">
            <Button 
              onClick={onViewAllScreens}
              variant="outline"
              className="px-8"
            >
              Ver Todas as {screens.length} Telas
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}