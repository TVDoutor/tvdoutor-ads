// @ts-nocheck
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Clock, ArrowLeft, Zap, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { searchScreensNearLocation, type SearchParams as SearchParamsType, type ScreenSearchResult } from '@/lib/search-service';

interface SearchParams {
  lat: string;
  lng: string;
  startDate: string;
  durationWeeks: string;
  radiusKm?: string;
  addressName: string;
  formattedAddress?: string;
  placeId?: string;
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [screens, setScreens] = useState<ScreenSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchData, setSearchData] = useState<SearchParams | null>(null);

  useEffect(() => {
    // Extrair parâmetros da URL
    const params: SearchParams = {
      lat: searchParams.get('lat') || '',
      lng: searchParams.get('lng') || '',
      startDate: searchParams.get('startDate') || '',
      durationWeeks: searchParams.get('durationWeeks') || '2',
      radiusKm: searchParams.get('radiusKm') || '5',
      addressName: searchParams.get('addressName') || '',
      formattedAddress: searchParams.get('formattedAddress') || '',
      placeId: searchParams.get('placeId') || ''
    };

    setSearchData(params);
    fetchScreens(params);
  }, [searchParams]);

  const fetchScreens = async (params: SearchParams) => {
    setLoading(true);
    
    try {
      // Converter parâmetros para o formato esperado pelo serviço
      const searchParams: SearchParamsType = {
        lat: parseFloat(params.lat),
        lng: parseFloat(params.lng),
        startDate: params.startDate,
        durationWeeks: params.durationWeeks,
        radiusKm: parseInt(params.radiusKm || '5'),
        addressName: params.addressName,
        formattedAddress: params.formattedAddress,
        placeId: params.placeId
      };

      console.log('🔍 Buscando telas com parâmetros:', searchParams);
      
      // Buscar telas reais no banco de dados
      const foundScreens = await searchScreensNearLocation(searchParams);
      
      setScreens(foundScreens);
      
      if (foundScreens.length > 0) {
        toast.success(`${foundScreens.length} telas encontradas próximas ao endereço!`);
      } else {
        toast.info('Nenhuma tela encontrada próxima ao endereço. Tente uma localização diferente.');
      }
      
    } catch (error) {
      console.error('Erro ao buscar telas:', error);
      toast.error('Erro ao buscar telas. Tente novamente.');
      setScreens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (screenId: string) => {
    // TODO: Implementar gatilho de autenticação
    toast.info(`Funcionalidade "Adicionar ao carrinho" será implementada na próxima etapa!`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Buscando telas disponíveis...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!searchData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Parâmetros de busca inválidos</h1>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header com informações da busca */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Nova busca
          </Button>
          
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">Resultados da Busca</h1>
            
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium">Localização</p>
                      <p className="text-muted-foreground">{searchData.addressName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium">Data de Início</p>
                      <p className="text-muted-foreground">{formatDate(searchData.startDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium">Duração</p>
                      <p className="text-muted-foreground">{searchData.durationWeeks} semana(s)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lista de telas encontradas */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {screens.length} telas encontradas próximas ao endereço
            </h2>
            <Badge variant="secondary">
              Raio: {searchData?.radiusKm || 5}km
            </Badge>
          </div>

          {screens.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  Nenhuma tela encontrada próxima ao endereço especificado.
                  <br />
                  Tente uma localização diferente ou entre em contato conosco.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {screens.map((screen) => (
                <Card key={screen.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{screen.display_name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <MapPin className="w-4 h-4" />
                          {screen.city}, {screen.state} • {screen.distance}km de distância
                        </CardDescription>
                      </div>
                      <Badge className={getClassColor(screen.class)}>
                        Classe {screen.class}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="font-medium">Alcance</p>
                          <p className="text-muted-foreground">{screen.reach.toLocaleString()} pessoas/semana</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="font-medium">Preço</p>
                          <p className="text-muted-foreground">R$ {screen.price.toFixed(2)}/semana</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <Button 
                        onClick={() => handleAddToCart(screen.id)}
                        className="w-full medical-gradient text-primary-foreground hover:opacity-90"
                      >
                        Adicionar ao Carrinho
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Call to action para login */}
        <Card className="mt-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold mb-2">
              Gostou do que viu?
            </h3>
            <p className="text-muted-foreground mb-4">
              Crie sua conta gratuita para começar a anunciar e acessar recursos exclusivos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => navigate('/login')}
                className="medical-gradient text-primary-foreground"
              >
                Criar Conta Grátis
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/login')}
              >
                Já tenho conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
