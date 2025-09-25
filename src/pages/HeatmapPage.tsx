import React, { useState } from 'react';
import { DashboardLayout } from "@/components/DashboardLayout";
import { HeatmapComponent } from '@/components/HeatmapComponent';
import { HeatmapFilters } from '@/components/HeatmapFilters';
import { useHeatmapData, HeatmapFilters as HeatmapFiltersType } from '@/hooks/useHeatmapData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, MapPin, BarChart3, Filter } from 'lucide-react';

export default function HeatmapPage() {
  const [filters, setFilters] = useState<HeatmapFiltersType>({});
  const { heatmapData, stats, cities, classes, loading, refetch } = useHeatmapData(filters);

  // Estatísticas dos dados (usar stats da API se disponível, senão calcular localmente)
  const totalPoints = stats?.total_screens || heatmapData.length;
  const maxIntensity = stats?.max_intensity || (heatmapData.length > 0 ? Math.max(...heatmapData.map(d => d.intensity)) : 0);
  const avgIntensity = stats?.avg_intensity || (heatmapData.length > 0 
    ? (heatmapData.reduce((sum, d) => sum + d.intensity, 0) / heatmapData.length).toFixed(1)
    : 0);

  const handleFiltersChange = (newFilters: HeatmapFiltersType) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    refetch();
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Mapa de Calor de Propostas</h1>
        <p className="text-gray-600">
          Visualize a popularidade das telas baseada no número de propostas
        </p>
      </div>

      {/* Filtros */}
      <HeatmapFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onApplyFilters={handleApplyFilters}
        cities={cities}
        classes={classes}
        loading={loading}
      />

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalPoints}</div>
                <div className="text-sm text-gray-600">Telas com Propostas</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{maxIntensity}</div>
                <div className="text-sm text-gray-600">Máx. Propostas/Tela</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{avgIntensity}</div>
                <div className="text-sm text-gray-600">Média Propostas/Tela</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Filter className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats?.cities_count || 0}</div>
                <div className="text-sm text-gray-600">Cidades Ativas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mapa de Calor */}
      <HeatmapComponent 
        filters={filters}
        showClusters={true}
        showHeatmap={true}
      />

      {/* Informações sobre o Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Como Interpretar o Mapa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">🎨 Cores do Heatmap</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• <span className="text-blue-500">Azul</span>: Baixa popularidade (poucas propostas)</li>
                <li>• <span className="text-green-500">Verde</span>: Popularidade média</li>
                <li>• <span className="text-yellow-500">Amarelo</span>: Alta popularidade</li>
                <li>• <span className="text-red-500">Vermelho</span>: Muito alta popularidade</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📊 Dados Exibidos</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Apenas telas com coordenadas válidas</li>
                <li>• Intensidade baseada no número de propostas</li>
                <li>• Dados atualizados em tempo real</li>
                <li>• Filtros por período, cidade e classe</li>
                <li>• Opção de normalização dos dados</li>
                <li>• Visualização em heatmap ou clusters</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-2">🔧 Funcionalidades</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium mb-1">Filtros Disponíveis:</h4>
                <ul className="space-y-1">
                  <li>• Período (data inicial e final)</li>
                  <li>• Cidade específica</li>
                  <li>• Classe da tela (A, B, C, D)</li>
                  <li>• Normalização dos dados</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-1">Visualizações:</h4>
                <ul className="space-y-1">
                  <li>• Heatmap: Visualização de calor</li>
                  <li>• Clusters: Agrupamento de pontos</li>
                  <li>• Cache: Dados em cache por 5 minutos</li>
                  <li>• Performance otimizada</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}
