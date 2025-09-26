import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BarChart3, 
  TrendingUp, 
  Download,
  Eye,
  DollarSign,
  Users,
  Monitor,
  AlertCircle,
  Calendar,
  Target,
  Activity,
  Zap,
  PieChart as PieChartIcon,
  FileText,
  RefreshCw,
  Filter
} from "lucide-react";
import { 
  BarChart,
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface KPIData {
  activeScreens: number;
  totalProposals: number;
  approvedProposals: number;
  approvalRate: number;
}

interface ChartData {
  name: string;
  value: number;
  propostas?: number;
  aprovadas?: number;
  color?: string;
}

interface TopClient {
  name: string;
  proposals: number;
}

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData>({
    activeScreens: 0,
    totalProposals: 0,
    approvedProposals: 0,
    approvalRate: 0
  });
  const [proposalsByMonth, setProposalsByMonth] = useState<ChartData[]>([]);
  const [screensByCity, setScreensByCity] = useState<ChartData[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);

  useEffect(() => {
    fetchReportsData();
  }, [selectedPeriod]);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      console.log('📊 Buscando dados dos relatórios...');
      
      await Promise.all([
        fetchKPIData(),
        fetchProposalsByMonth(),
        fetchScreensByCity(),
        fetchTopClients()
      ]);
      
      console.log('✅ Dados dos relatórios carregados');
    } catch (error: any) {
      console.error('💥 Erro ao carregar relatórios:', error);
      toast.error(`Erro ao carregar relatórios: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIData = async () => {
    try {
      // Buscar telas ativas com coordenadas válidas
      const { data: screens, error: screensError } = await supabase
        .from('screens')
        .select('id, active, lat, lng')
        .eq('active', true)
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (screensError) throw screensError;

      // Buscar total de propostas
      const { data: proposals, error: proposalsError } = await supabase
        .from('proposals')
        .select('id, status');

      if (proposalsError) throw proposalsError;

      const totalProposals = proposals?.length || 0;
      const approvedProposals = proposals?.filter(p => p.status === 'approved').length || 0;
      const approvalRate = totalProposals > 0 ? (approvedProposals / totalProposals) * 100 : 0;

      setKpiData({
        activeScreens: screens?.length || 0,
        totalProposals,
        approvedProposals,
        approvalRate: Math.round(approvalRate * 10) / 10
      });
    } catch (error) {
      console.error('❌ Erro ao buscar KPIs:', error);
    }
  };

  const fetchProposalsByMonth = async () => {
    try {
      const { data: proposals, error } = await supabase
        .from('proposals')
        .select('id, created_at, status');

      if (error) throw error;

      // Processar dados por mês (últimos 6 meses)
      const monthsData: { [key: string]: { total: number; approved: number } } = {};
      const now = new Date();
      
      // Inicializar últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toLocaleDateString('pt-BR', { month: 'short' });
        monthsData[monthKey] = { total: 0, approved: 0 };
      }

      // Contar propostas por mês
      proposals?.forEach(proposal => {
        const date = new Date(proposal.created_at);
        const monthKey = date.toLocaleDateString('pt-BR', { month: 'short' });
        
        if (monthsData[monthKey]) {
          monthsData[monthKey].total++;
          if (proposal.status === 'approved') {
            monthsData[monthKey].approved++;
          }
        }
      });

      const chartData = Object.entries(monthsData).map(([month, data]) => ({
        name: month,
        propostas: data.total,
        aprovadas: data.approved,
        value: data.total
      }));

      setProposalsByMonth(chartData);
    } catch (error) {
      console.error('❌ Erro ao buscar propostas por mês:', error);
    }
  };

  const fetchScreensByCity = async () => {
    try {
      const { data: screens, error } = await supabase
        .from('screens')
        .select('city')
        .eq('active', true);

      if (error) throw error;

      // Contar por cidade
      const cityCount: { [key: string]: number } = {};
      screens?.forEach(screen => {
        const city = screen.city || 'Não informado';
        cityCount[city] = (cityCount[city] || 0) + 1;
      });

      // Ordenar e pegar top 4 + outras
      const sortedCities = Object.entries(cityCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 4);

      const otherCount = Object.values(cityCount)
        .slice(4)
        .reduce((sum, count) => sum + count, 0);

      const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
      
      const chartData = sortedCities.map(([city, count], index) => ({
        name: city,
        value: count,
        color: colors[index]
      }));

      if (otherCount > 0) {
        chartData.push({
          name: 'Outras',
          value: otherCount,
          color: colors[4]
        });
      }

      setScreensByCity(chartData);
    } catch (error) {
      console.error('❌ Erro ao buscar telas por cidade:', error);
    }
  };

  const fetchTopClients = async () => {
    try {
      const { data: proposals, error } = await supabase
        .from('proposals')
        .select('customer_name');

      if (error) throw error;

      // Contar por cliente
      const clientCount: { [key: string]: number } = {};
      proposals?.forEach(proposal => {
        const client = proposal.customer_name || 'Cliente não informado';
        clientCount[client] = (clientCount[client] || 0) + 1;
      });

      // Ordenar e pegar top 5
      const topClientsData = Object.entries(clientCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, proposals]) => ({
          name,
          proposals
        }));

      setTopClients(topClientsData);
    } catch (error) {
      console.error('❌ Erro ao buscar top clientes:', error);
    }
  };



  const handleExportReport = (type: string) => {
    console.log(`Exportando relatório: ${type}`);
    toast.info(`Exportação de ${type} será implementada em breve`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold mb-2">Carregando Relatórios</h3>
              <p className="text-muted-foreground">
                Processando dados e preparando visualizações...
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
            <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics & Relatórios</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Insights detalhados sobre sua performance • Período: {selectedPeriod === '7d' ? 'Últimos 7 dias' : selectedPeriod === '30d' ? 'Últimos 30 dias' : selectedPeriod === '90d' ? 'Últimos 90 dias' : 'Último ano'}
                  </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[180px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="1y">Último ano</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={fetchReportsData} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Atualizar
            </Button>
            
            <Button className="gap-2" onClick={() => handleExportReport('completo')}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Enhanced KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-blue-800">Telas Ativas</p>
                    <p className="text-3xl font-bold text-blue-900">{kpiData.activeScreens.toLocaleString()}</p>
                    <p className="text-xs text-blue-700">Com coordenadas válidas</p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-lg">
                    <Monitor className="h-8 w-8 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-green-800">Propostas Totais</p>
                    <p className="text-3xl font-bold text-green-900">{kpiData.totalProposals}</p>
                    <p className="text-xs text-green-700">Todas as propostas</p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-lg">
                    <FileText className="h-8 w-8 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-purple-800">Propostas Aprovadas</p>
                    <p className="text-3xl font-bold text-purple-900">{kpiData.approvedProposals}</p>
                    <p className="text-xs text-purple-700">Status aprovado</p>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-orange-800">Taxa de Conversão</p>
                    <p className="text-3xl font-bold text-orange-900">{kpiData.approvalRate}%</p>
                    <p className="text-xs text-orange-700">
                    {kpiData.totalProposals > 0 ? 'Baseado em dados reais' : 'Sem dados'}
                  </p>
                </div>
                  <div className="p-3 bg-orange-200 rounded-lg">
                    <Target className="h-8 w-8 text-orange-700" />
                  </div>
                </div>
                {kpiData.totalProposals > 0 && (
                  <div className="mt-4">
                    <Progress value={kpiData.approvalRate} className="h-2" />
              </div>
                )}
            </CardContent>
          </Card>
        </div>

          {/* Reports Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full max-w-[600px] grid-cols-4">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="proposals" className="gap-2">
                <FileText className="h-4 w-4" />
                Propostas
              </TabsTrigger>
              <TabsTrigger value="inventory" className="gap-2">
                <Monitor className="h-4 w-4" />
                Inventário
              </TabsTrigger>
              <TabsTrigger value="clients" className="gap-2">
                <Users className="h-4 w-4" />
                Clientes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Proposals Chart */}
                <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Propostas por Mês
              </CardTitle>
                    <CardDescription>
                      Evolução das propostas nos últimos 6 meses
                    </CardDescription>
            </CardHeader>
            <CardContent>
              {proposalsByMonth.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={proposalsByMonth}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Bar dataKey="propostas" fill="#3b82f6" name="Enviadas" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="aprovadas" fill="#10b981" name="Aprovadas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                      <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                    <p>Nenhum dado de propostas encontrado</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Screen Distribution Chart */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5 text-primary" />
                      Distribuição por Cidade
                    </CardTitle>
                    <CardDescription>
                      Distribuição geográfica das telas ativas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {screensByCity.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={screensByCity}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={110}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {screensByCity.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'white', 
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-4 space-y-3">
                          {screensByCity.map((city, index) => (
                            <div key={index} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-4 h-4 rounded-full shadow-sm" 
                                  style={{ backgroundColor: city.color }}
                                />
                                <span className="font-medium">{city.name}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {city.value} telas
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                          <p>Nenhuma tela ativa encontrada</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="proposals" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Análise de Propostas
                  </CardTitle>
                  <CardDescription>
                    Desempenho detalhado das suas propostas comerciais
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-900">{kpiData.totalProposals}</div>
                      <div className="text-sm text-blue-700">Total Criadas</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-900">{kpiData.approvedProposals}</div>
                      <div className="text-sm text-green-700">Aprovadas</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-900">{kpiData.approvalRate}%</div>
                      <div className="text-sm text-orange-700">Taxa de Sucesso</div>
                    </div>
                  </div>
                  
                  {proposalsByMonth.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={proposalsByMonth}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="propostas" fill="#3b82f6" name="Enviadas" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="aprovadas" fill="#10b981" name="Aprovadas" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4" />
                        <p className="text-lg font-medium">Nenhum dado encontrado</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="h-5 w-5 text-primary" />
                      Inventário de Telas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Zap className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-900">Telas Ativas</span>
                        </div>
                        <span className="text-xl font-bold text-green-900">{kpiData.activeScreens}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-900">{cities.length}</div>
                          <div className="text-sm text-blue-700">Cidades</div>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <div className="text-lg font-bold text-purple-900">{existingClasses.length}</div>
                          <div className="text-sm text-purple-700">Classes</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5 text-primary" />
                      Distribuição Geográfica
              </CardTitle>
            </CardHeader>
            <CardContent>
              {screensByCity.length > 0 ? (
                <>
                        <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={screensByCity}
                        cx="50%"
                        cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              paddingAngle={2}
                        dataKey="value"
                      >
                        {screensByCity.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {screensByCity.map((city, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: city.color }}
                          />
                          <span>{city.name}</span>
                        </div>
                        <span className="font-medium">{city.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                    <p>Nenhuma tela ativa encontrada</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
            </TabsContent>

            <TabsContent value="clients" className="space-y-6">
              <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
                    Top Clientes
            </CardTitle>
                  <CardDescription>
                    Clientes com maior número de propostas
                  </CardDescription>
          </CardHeader>
          <CardContent>
            {topClients.length > 0 ? (
              <div className="space-y-4">
                {topClients.map((client, index) => (
                        <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                        {index + 1}
                      </div>
                      <div>
                              <p className="font-semibold text-gray-900">{client.name}</p>
                              <p className="text-sm text-gray-600">
                          {client.proposals} {client.proposals === 1 ? 'proposta' : 'propostas'}
                        </p>
                      </div>
                    </div>
                          <Badge variant="secondary" className="text-sm">
                            #{index + 1}
                          </Badge>
                  </div>
                ))}
              </div>
            ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <Users className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-lg font-medium">Nenhum cliente encontrado</p>
                <p className="text-sm">Dados aparecerão quando houver propostas cadastradas</p>
              </div>
            )}
          </CardContent>
        </Card>
            </TabsContent>
          </Tabs>

          {/* Enhanced Export Section */}
          <Card className="shadow-lg border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
                Central de Exportação
            </CardTitle>
              <CardDescription>
                Baixe relatórios detalhados em diferentes formatos
              </CardDescription>
          </CardHeader>
          <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-md transition-shadow cursor-pointer" 
                      onClick={() => handleExportReport("financial")}>
                  <CardContent className="p-6 text-center">
                    <div className="p-3 bg-green-200 rounded-lg inline-block mb-4">
                      <DollarSign className="h-8 w-8 text-green-700" />
                    </div>
                    <h3 className="font-semibold text-green-900 mb-2">Relatório Financeiro</h3>
                    <p className="text-sm text-green-700">Análise de receitas, custos e margem</p>
                  </CardContent>
                </Card>
                
                <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-md transition-shadow cursor-pointer" 
                      onClick={() => handleExportReport("proposals")}>
                  <CardContent className="p-6 text-center">
                    <div className="p-3 bg-blue-200 rounded-lg inline-block mb-4">
                      <FileText className="h-8 w-8 text-blue-700" />
                    </div>
                    <h3 className="font-semibold text-blue-900 mb-2">Relatório de Propostas</h3>
                    <p className="text-sm text-blue-700">Performance e conversão das propostas</p>
                  </CardContent>
                </Card>
                
                <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-md transition-shadow cursor-pointer" 
                      onClick={() => handleExportReport("inventory")}>
                  <CardContent className="p-6 text-center">
                    <div className="p-3 bg-purple-200 rounded-lg inline-block mb-4">
                      <Monitor className="h-8 w-8 text-purple-700" />
                    </div>
                    <h3 className="font-semibold text-purple-900 mb-2">Relatório de Inventário</h3>
                    <p className="text-sm text-purple-700">Status e disponibilidade das telas</p>
                  </CardContent>
                </Card>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;