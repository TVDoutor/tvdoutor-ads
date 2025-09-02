import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar,
  Filter,
  Eye,
  DollarSign,
  Users,
  Monitor,
  AlertCircle
} from "lucide-react";
import { 
  LineChart, 
  Line, 
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
        <div className="p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando relatórios...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Relatórios</h1>
              <p className="text-muted-foreground">Analytics e insights da plataforma</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[180px]">
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
              🔄 Recarregar
            </Button>
            
            <Button className="gap-2" onClick={() => handleExportReport('completo')}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Telas Ativas</p>
                  <p className="text-2xl font-bold">{kpiData.activeScreens.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Com coordenadas válidas</p>
                </div>
                <Monitor className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Propostas Totais</p>
                  <p className="text-2xl font-bold">{kpiData.totalProposals}</p>
                  <p className="text-sm text-muted-foreground">Todas as propostas</p>
                </div>
                <Eye className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Propostas Aprovadas</p>
                  <p className="text-2xl font-bold">{kpiData.approvedProposals}</p>
                  <p className="text-sm text-muted-foreground">Status aprovado</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Aprovação</p>
                  <p className="text-2xl font-bold">{kpiData.approvalRate}%</p>
                  <p className="text-sm text-muted-foreground">
                    {kpiData.totalProposals > 0 ? 'Baseado em dados reais' : 'Sem dados'}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Proposals Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-secondary" />
                Propostas por Mês (Últimos 6 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {proposalsByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={proposalsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="propostas" fill="hsl(var(--secondary))" name="Enviadas" />
                    <Bar dataKey="aprovadas" fill="hsl(var(--primary))" name="Aprovadas" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                    <p>Nenhum dado de propostas encontrado</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Screen Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-accent" />
                Distribuição de Telas por Cidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {screensByCity.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={screensByCity}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={100}
                        paddingAngle={5}
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
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                    <p>Nenhuma tela ativa encontrada</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Top Clientes por Propostas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length > 0 ? (
              <div className="space-y-4">
                {topClients.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.proposals} {client.proposals === 1 ? 'proposta' : 'propostas'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2" />
                <p>Nenhum cliente encontrado</p>
                <p className="text-sm">Dados aparecerão quando houver propostas cadastradas</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Exportar Relatórios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="gap-2 h-20 flex-col"
                onClick={() => handleExportReport("financial")}
              >
                <DollarSign className="h-6 w-6" />
                <span>Relatório Financeiro</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="gap-2 h-20 flex-col"
                onClick={() => handleExportReport("proposals")}
              >
                <Eye className="h-6 w-6" />
                <span>Relatório de Propostas</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="gap-2 h-20 flex-col"
                onClick={() => handleExportReport("inventory")}
              >
                <Monitor className="h-6 w-6" />
                <span>Relatório de Inventário</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Reports;