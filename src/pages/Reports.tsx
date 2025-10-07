// @ts-nocheck
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Filter,
  MapPin,
  Building2,
  Flame,
  Snowflake,
  Award,
  TrendingDown,
  Globe,
  Layers,
  BarChart4,
  LineChart
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
  Cell,
  LineChart as RechartsLineChart,
  Line,
  Area,
  AreaChart,
  Scatter,
  ScatterChart,
  ComposedChart
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface KPIData {
  activeScreens: number;
  totalProposals: number;
  approvedProposals: number;
  approvalRate: number;
  totalUsers: number;
  totalAgencies: number;
  totalCampaigns: number;
  totalRevenue: number;
}

interface ChartData {
  name: string;
  value: number;
  propostas?: number;
  aprovadas?: number;
  color?: string;
  usage?: number;
  temperature?: number;
}

interface TopClient {
  name: string;
  proposals: number;
  revenue?: number;
}

interface HeatmapData {
  screen_id: number;
  screen_name: string;
  city: string;
  usage_count: number;
  temperature: number;
  lat: number;
  lng: number;
}

interface UserStats {
  user_id: string;
  user_name: string;
  proposals_count: number;
  revenue_generated: number;
}

interface InventoryStats {
  specialty: string;
  region: string;
  class: string;
  screen_count: number;
  active_count: number;
}

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData>({
    activeScreens: 0,
    totalProposals: 0,
    approvedProposals: 0,
    approvalRate: 0,
    totalUsers: 0,
    totalAgencies: 0,
    totalCampaigns: 0,
    totalRevenue: 0
  });
  const [proposalsByMonth, setProposalsByMonth] = useState<ChartData[]>([]);
  const [screensByCity, setScreensByCity] = useState<ChartData[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [topUsers, setTopUsers] = useState<UserStats[]>([]);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats[]>([]);
  const [campaignsData, setCampaignsData] = useState<ChartData[]>([]);
  const [agenciesData, setAgenciesData] = useState<ChartData[]>([]);

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
        fetchTopClients(),
        fetchHeatmapData(),
        fetchTopUsers(),
        fetchInventoryStats(),
        fetchCampaignsData(),
        fetchAgenciesData()
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
        .select('id, status, net_business');

      if (proposalsError) throw proposalsError;

      // Buscar total de usuários
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id');

      if (usersError) throw usersError;

      // Buscar total de agências
      const { data: agencies, error: agenciesError } = await supabase
        .from('agencias')
        .select('id');

      if (agenciesError) throw agenciesError;

      // Buscar total de campanhas
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id');

      if (campaignsError) throw campaignsError;

      const totalProposals = proposals?.length || 0;
      const approvedProposals = proposals?.filter(p => p.status === 'aceita').length || 0;
      const approvalRate = totalProposals > 0 ? (approvedProposals / totalProposals) * 100 : 0;
      const totalRevenue = proposals?.reduce((sum, p) => sum + (p.net_business || 0), 0) || 0;

      setKpiData({
        activeScreens: screens?.length || 0,
        totalProposals,
        approvedProposals,
        approvalRate: Math.round(approvalRate * 10) / 10,
        totalUsers: users?.length || 0,
        totalAgencies: agencies?.length || 0,
        totalCampaigns: campaigns?.length || 0,
        totalRevenue
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
          if (proposal.status === 'aceita') {
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
        .select('customer_name, net_business');

      if (error) throw error;

      // Contar por cliente
      const clientData: { [key: string]: { proposals: number; revenue: number } } = {};
      proposals?.forEach(proposal => {
        const client = proposal.customer_name || 'Cliente não informado';
        if (!clientData[client]) {
          clientData[client] = { proposals: 0, revenue: 0 };
        }
        clientData[client].proposals++;
        clientData[client].revenue += proposal.net_business || 0;
      });

      // Ordenar e pegar top 5
      const topClientsData = Object.entries(clientData)
        .sort(([,a], [,b]) => b.proposals - a.proposals)
        .slice(0, 5)
        .map(([name, data]) => ({
          name,
          proposals: data.proposals,
          revenue: data.revenue
        }));

      setTopClients(topClientsData);
    } catch (error) {
      console.error('❌ Erro ao buscar top clientes:', error);
    }
  };

  const fetchHeatmapData = async () => {
    try {
      // Buscar screens mais utilizadas em propostas
      const { data: proposalScreens, error } = await supabase
        .from('proposal_screens')
        .select(`
          screen_id,
          proposal_id,
          screens!inner(
            id,
            name,
            city,
            lat,
            lng
          )
        `);

      if (error) throw error;

      // Contar uso por screen
      const screenUsage: { [key: number]: { count: number; screen: any } } = {};
      proposalScreens?.forEach(ps => {
        const screenId = ps.screen_id;
        if (!screenUsage[screenId]) {
          screenUsage[screenId] = { count: 0, screen: ps.screens };
        }
        screenUsage[screenId].count++;
      });

      // Calcular temperatura (0-100) baseada no uso
      const maxUsage = Math.max(...Object.values(screenUsage).map(s => s.count));
      const heatmapData = Object.entries(screenUsage).map(([screenId, data]) => ({
        screen_id: parseInt(screenId),
        screen_name: data.screen.name || `Screen ${screenId}`,
        city: data.screen.city || 'Não informado',
        usage_count: data.count,
        temperature: maxUsage > 0 ? (data.count / maxUsage) * 100 : 0,
        lat: data.screen.lat || 0,
        lng: data.screen.lng || 0
      }));

      setHeatmapData(heatmapData);
    } catch (error) {
      console.error('❌ Erro ao buscar dados do mapa de calor:', error);
    }
  };

  const fetchTopUsers = async () => {
    try {
      const { data: proposals, error } = await supabase
        .from('proposals')
        .select('created_by, net_business, profiles!inner(display_name)');

      if (error) throw error;

      // Contar propostas e receita por usuário
      const userData: { [key: string]: { proposals: number; revenue: number; name: string } } = {};
      proposals?.forEach(proposal => {
        const userId = proposal.created_by;
        if (!userData[userId]) {
          userData[userId] = { proposals: 0, revenue: 0, name: proposal.profiles?.display_name || 'Usuário' };
        }
        userData[userId].proposals++;
        userData[userId].revenue += proposal.net_business || 0;
      });

      // Ordenar e pegar top 10
      const topUsersData = Object.entries(userData)
        .sort(([,a], [,b]) => b.proposals - a.proposals)
        .slice(0, 10)
        .map(([userId, data]) => ({
          user_id: userId,
          user_name: data.name,
          proposals_count: data.proposals,
          revenue_generated: data.revenue
        }));

      setTopUsers(topUsersData);
    } catch (error) {
      console.error('❌ Erro ao buscar top usuários:', error);
    }
  };

  const fetchInventoryStats = async () => {
    try {
      const { data: screens, error } = await supabase
        .from('screens')
        .select('specialty, city, class, active');

      if (error) throw error;

      // Agrupar por especialidade, região e classe
      const inventoryData: { [key: string]: InventoryStats } = {};
      screens?.forEach(screen => {
        const specialty = screen.specialty?.[0] || 'Não informado';
        const region = screen.city || 'Não informado';
        const classType = screen.class || 'Não informado';
        const key = `${specialty}-${region}-${classType}`;
        
        if (!inventoryData[key]) {
          inventoryData[key] = {
            specialty,
            region,
            class: classType,
            screen_count: 0,
            active_count: 0
          };
        }
        
        inventoryData[key].screen_count++;
        if (screen.active) {
          inventoryData[key].active_count++;
        }
      });

      setInventoryStats(Object.values(inventoryData));
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas do inventário:', error);
    }
  };

  const fetchCampaignsData = async () => {
    try {
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('status, created_at');

      if (error) throw error;

      // Agrupar por status
      const statusCount: { [key: string]: number } = {};
      campaigns?.forEach(campaign => {
        const status = campaign.status || 'Não informado';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });

      const colors = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
      const campaignsData = Object.entries(statusCount).map(([status, count], index) => ({
        name: status,
        value: count,
        color: colors[index % colors.length]
      }));

      setCampaignsData(campaignsData);
    } catch (error) {
      console.error('❌ Erro ao buscar dados de campanhas:', error);
    }
  };

  const fetchAgenciesData = async () => {
    try {
      const { data: agencies, error } = await supabase
        .from('agencias')
        .select('estado, created_at');

      if (error) throw error;

      // Agrupar por estado
      const stateCount: { [key: string]: number } = {};
      agencies?.forEach(agency => {
        const state = agency.estado || 'Não informado';
        stateCount[state] = (stateCount[state] || 0) + 1;
      });

      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
      const agenciesData = Object.entries(stateCount).map(([state, count], index) => ({
        name: state,
        value: count,
        color: colors[index % colors.length]
      }));

      setAgenciesData(agenciesData);
    } catch (error) {
      console.error('❌ Erro ao buscar dados de agências:', error);
    }
  };



  const handleExportReport = (type: string) => {
    console.log(`Exportando relatório: ${type}`);
    toast.info(`Exportação de ${type} será implementada em breve`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary/5 flex items-center justify-center">
          <Card className="w-full max-w-md border-0 shadow-xl bg-gradient-to-br from-white to-primary/5">
            <CardContent className="p-8 text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-6"></div>
                <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-primary/30 animate-spin mx-auto mb-6" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Carregando Relatórios</h3>
              <p className="text-gray-600">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary/5">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl shadow-sm">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
            <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics & Relatórios</h1>
                  <p className="text-sm text-gray-600 mt-1">
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
            
            <Button 
              variant="outline" 
              onClick={fetchReportsData} 
              className="gap-2 hover:bg-primary/5 hover:border-primary/20 transition-all duration-300"
            >
                  <RefreshCw className="h-4 w-4" />
                  Atualizar
            </Button>
            
            <Button 
              className="gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300" 
              onClick={() => handleExportReport('completo')}
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Enhanced KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white rounded-xl border border-gray-200/60 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">Telas Ativas</p>
                    <p className="text-3xl font-bold text-gray-900 group-hover:text-primary transition-colors duration-300">{kpiData.activeScreens.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Com coordenadas válidas</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl group-hover:from-blue-200 group-hover:to-blue-100 transition-all duration-300">
                    <Monitor className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

            <Card className="bg-white rounded-xl border border-gray-200/60 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">Propostas Totais</p>
                    <p className="text-3xl font-bold text-gray-900 group-hover:text-green-600 transition-colors duration-300">{kpiData.totalProposals}</p>
                    <p className="text-xs text-gray-500">Todas as propostas</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-green-100 to-green-50 rounded-xl group-hover:from-green-200 group-hover:to-green-100 transition-all duration-300">
                    <FileText className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

            <Card className="bg-white rounded-xl border border-gray-200/60 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">Propostas Aprovadas</p>
                    <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors duration-300">{kpiData.approvedProposals}</p>
                    <p className="text-xs text-gray-500">Status aprovado</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl group-hover:from-purple-200 group-hover:to-purple-100 transition-all duration-300">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

            <Card className="bg-white rounded-xl border border-gray-200/60 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
                    <p className="text-3xl font-bold text-gray-900 group-hover:text-primary transition-colors duration-300">{kpiData.approvalRate}%</p>
                    <p className="text-xs text-gray-500">
                    {kpiData.totalProposals > 0 ? 'Baseado em dados reais' : 'Sem dados'}
                  </p>
                </div>
                  <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                    <Target className="h-8 w-8 text-primary" />
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

        {/* Segunda linha de KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white rounded-xl border border-gray-200/60 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
                  <p className="text-3xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors duration-300">{kpiData.totalUsers}</p>
                  <p className="text-xs text-gray-500">Usuários cadastrados</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl group-hover:from-indigo-200 group-hover:to-indigo-100 transition-all duration-300">
                  <Users className="h-8 w-8 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-xl border border-gray-200/60 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Agências</p>
                  <p className="text-3xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors duration-300">{kpiData.totalAgencies}</p>
                  <p className="text-xs text-gray-500">Agências parceiras</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl group-hover:from-orange-200 group-hover:to-orange-100 transition-all duration-300">
                  <Building2 className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-xl border border-gray-200/60 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Campanhas</p>
                  <p className="text-3xl font-bold text-gray-900 group-hover:text-cyan-600 transition-colors duration-300">{kpiData.totalCampaigns}</p>
                  <p className="text-xs text-gray-500">Campanhas ativas</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-cyan-100 to-cyan-50 rounded-xl group-hover:from-cyan-200 group-hover:to-cyan-100 transition-all duration-300">
                  <Activity className="h-8 w-8 text-cyan-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-xl border border-gray-200/60 hover:shadow-lg transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Receita Total</p>
                  <p className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors duration-300">
                    R$ {kpiData.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">Valor total gerado</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl group-hover:from-emerald-200 group-hover:to-emerald-100 transition-all duration-300">
                  <DollarSign className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Reports Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full max-w-[800px] grid-cols-6">
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
              <TabsTrigger value="heatmap" className="gap-2">
                <Flame className="h-4 w-4" />
                Mapa de Calor
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Usuários
              </TabsTrigger>
              <TabsTrigger value="clients" className="gap-2">
                <Building2 className="h-4 w-4" />
                Clientes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Proposals Chart */}
                <Card className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl border border-gray-200/60 shadow-xl hover:shadow-2xl transition-all duration-500 group">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      Propostas por Mês
              </CardTitle>
                    <CardDescription className="text-gray-600">
                      Evolução das propostas nos últimos 6 meses
                    </CardDescription>
            </CardHeader>
            <CardContent>
              {proposalsByMonth.length > 0 ? (
                      <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={proposalsByMonth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <defs>
                            <linearGradient id="propostasGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                              <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.7}/>
                            </linearGradient>
                            <linearGradient id="aprovadasGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                              <stop offset="95%" stopColor="#059669" stopOpacity={0.7}/>
                            </linearGradient>
                            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000000" floodOpacity="0.1"/>
                            </filter>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                          <XAxis 
                            dataKey="name" 
                            className="text-sm font-medium"
                            tick={{ fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                          />
                          <YAxis 
                            className="text-sm font-medium"
                            tick={{ fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                              padding: '16px'
                            }}
                            labelStyle={{ color: '#374151', fontWeight: '600' }}
                          />
                          <Bar 
                            dataKey="propostas" 
                            fill="url(#propostasGradient)" 
                            name="Enviadas" 
                            radius={[8, 8, 0, 0]}
                            filter="url(#shadow)"
                          />
                          <Bar 
                            dataKey="aprovadas" 
                            fill="url(#aprovadasGradient)" 
                            name="Aprovadas" 
                            radius={[8, 8, 0, 0]}
                            filter="url(#shadow)"
                          />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                      <div className="h-[380px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-500">Nenhum dado de propostas encontrado</p>
                    <p className="text-sm text-gray-400 mt-1">Dados aparecerão quando houver propostas cadastradas</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Screen Distribution Chart */}
                <Card className="bg-gradient-to-br from-white to-purple-50/30 rounded-2xl border border-gray-200/60 shadow-xl hover:shadow-2xl transition-all duration-500 group">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                        <PieChartIcon className="h-6 w-6 text-white" />
                      </div>
                      Distribuição por Cidade
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Distribuição geográfica das telas ativas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {screensByCity.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={320}>
                          <PieChart>
                            <defs>
                              <filter id="pieShadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.15"/>
                              </filter>
                            </defs>
                            <Pie
                              data={screensByCity}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={120}
                              paddingAngle={3}
                              dataKey="value"
                              filter="url(#pieShadow)"
                            >
                              {screensByCity.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.color}
                                  stroke="white"
                                  strokeWidth={2}
                                  style={{
                                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                                  }}
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'white', 
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                padding: '16px'
                              }}
                              labelStyle={{ color: '#374151', fontWeight: '600' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-6 space-y-3">
                          {screensByCity.map((city, index) => (
                            <div key={index} className="flex items-center justify-between text-sm p-3 rounded-xl bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all duration-300 group/item border border-gray-100">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-5 h-5 rounded-full shadow-md border-2 border-white" 
                                  style={{ backgroundColor: city.color }}
                                />
                                <span className="font-semibold text-gray-800 group-hover/item:text-gray-900 transition-colors">{city.name}</span>
                              </div>
                              <Badge variant="secondary" className="text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                                {city.value} telas
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-[380px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-lg font-medium text-gray-500">Nenhuma tela ativa encontrada</p>
                          <p className="text-sm text-gray-400 mt-1">Dados aparecerão quando houver telas cadastradas</p>
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
                <Card className="bg-white rounded-xl border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
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
                          <div className="text-lg font-bold text-blue-900">{screensByCity.length}</div>
                          <div className="text-sm text-blue-700">Cidades</div>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <div className="text-lg font-bold text-purple-900">{kpiData.activeScreens}</div>
                          <div className="text-sm text-purple-700">Telas Ativas</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white rounded-xl border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
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

        {/* Inventário Detalhado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white rounded-xl border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Inventário por Especialidade
              </CardTitle>
              <CardDescription>
                Distribuição de telas por especialidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inventoryStats.length > 0 ? (
                <div className="space-y-3">
                  {inventoryStats
                    .reduce((acc, item) => {
                      const existing = acc.find(i => i.specialty === item.specialty);
                      if (existing) {
                        existing.screen_count += item.screen_count;
                        existing.active_count += item.active_count;
                      } else {
                        acc.push({ ...item });
                      }
                      return acc;
                    }, [] as InventoryStats[])
                    .sort((a, b) => b.screen_count - a.screen_count)
                    .slice(0, 8)
                    .map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{item.specialty}</p>
                            <p className="text-sm text-gray-600">{item.region}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{item.screen_count} telas</p>
                          <p className="text-xs text-green-600">{item.active_count} ativas</p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Layers className="w-12 h-12 mx-auto mb-2" />
                    <p>Nenhum dado de especialidade encontrado</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white rounded-xl border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Inventário por Região
              </CardTitle>
              <CardDescription>
                Distribuição de telas por região
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inventoryStats.length > 0 ? (
                <div className="space-y-3">
                  {inventoryStats
                    .reduce((acc, item) => {
                      const existing = acc.find(i => i.region === item.region);
                      if (existing) {
                        existing.screen_count += item.screen_count;
                        existing.active_count += item.active_count;
                      } else {
                        acc.push({ ...item });
                      }
                      return acc;
                    }, [] as InventoryStats[])
                    .sort((a, b) => b.screen_count - a.screen_count)
                    .slice(0, 8)
                    .map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-50 to-green-50 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{item.region}</p>
                            <p className="text-sm text-gray-600">{item.specialty}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{item.screen_count} telas</p>
                          <p className="text-xs text-green-600">{item.active_count} ativas</p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Globe className="w-12 h-12 mx-auto mb-2" />
                    <p>Nenhum dado de região encontrado</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
            </TabsContent>

            <TabsContent value="heatmap" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white rounded-xl border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-red-500" />
                      Screens Mais Utilizadas
                    </CardTitle>
                    <CardDescription>
                      Screens com maior frequência de uso em propostas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {heatmapData.length > 0 ? (
                      <div className="space-y-4">
                        {heatmapData
                          .sort((a, b) => b.usage_count - a.usage_count)
                          .slice(0, 10)
                          .map((screen, index) => (
                            <div key={screen.screen_id} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-50 to-red-50 hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{screen.screen_name}</p>
                                  <p className="text-sm text-gray-600">{screen.city}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  {screen.temperature > 80 ? (
                                    <Flame className="h-4 w-4 text-red-500" />
                                  ) : screen.temperature > 50 ? (
                                    <Flame className="h-4 w-4 text-orange-500" />
                                  ) : (
                                    <Snowflake className="h-4 w-4 text-blue-500" />
                                  )}
                                  <span className="text-sm font-medium">
                                    {screen.temperature.toFixed(0)}°C
                                  </span>
                                </div>
                                <Badge variant="secondary" className="text-sm">
                                  {screen.usage_count} usos
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Flame className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-lg font-medium">Nenhum dado de uso encontrado</p>
                          <p className="text-sm">Dados aparecerão quando houver propostas com screens</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white rounded-xl border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Distribuição de Temperatura
                    </CardTitle>
                    <CardDescription>
                      Visualização da distribuição de uso por temperatura
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {heatmapData.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-4 bg-gradient-to-br from-red-100 to-red-50 rounded-lg">
                            <Flame className="h-8 w-8 text-red-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-red-900">
                              {heatmapData.filter(s => s.temperature > 80).length}
                            </div>
                            <div className="text-sm text-red-700">Muito Quente</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg">
                            <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-orange-900">
                              {heatmapData.filter(s => s.temperature > 50 && s.temperature <= 80).length}
                            </div>
                            <div className="text-sm text-orange-700">Quente</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg">
                            <Snowflake className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-blue-900">
                              {heatmapData.filter(s => s.temperature <= 50).length}
                            </div>
                            <div className="text-sm text-blue-700">Frio</div>
                          </div>
                        </div>
                        
                        <div className="mt-6">
                          <h4 className="font-semibold text-gray-900 mb-3">Legenda de Temperatura</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-red-600 rounded"></div>
                              <span className="text-sm">80-100°C: Muito utilizado (Hot)</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded"></div>
                              <span className="text-sm">50-80°C: Moderadamente utilizado (Warm)</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded"></div>
                              <span className="text-sm">0-50°C: Pouco utilizado (Cold)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-lg font-medium">Nenhum dado de temperatura</p>
                          <p className="text-sm">Dados aparecerão quando houver screens utilizadas</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white rounded-xl border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-yellow-500" />
                      Top Usuários por Propostas
                    </CardTitle>
                    <CardDescription>
                      Usuários que mais geraram propostas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topUsers.length > 0 ? (
                      <div className="space-y-4">
                        {topUsers.map((user, index) => (
                          <div key={user.user_id} className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-gray-50 to-yellow-50 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{user.user_name}</p>
                                <p className="text-sm text-gray-600">
                                  {user.proposals_count} {user.proposals_count === 1 ? 'proposta' : 'propostas'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary" className="text-sm mb-1">
                                #{index + 1}
                              </Badge>
                              <p className="text-sm font-medium text-green-600">
                                R$ {user.revenue_generated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Award className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-lg font-medium">Nenhum usuário encontrado</p>
                          <p className="text-sm">Dados aparecerão quando houver propostas criadas</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white rounded-xl border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Performance de Usuários
                    </CardTitle>
                    <CardDescription>
                      Análise de produtividade por usuário
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topUsers.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="p-4 bg-gradient-to-br from-green-100 to-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-900">
                              {topUsers.reduce((sum, user) => sum + user.proposals_count, 0)}
                            </div>
                            <div className="text-sm text-green-700">Total de Propostas</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-900">
                              R$ {topUsers.reduce((sum, user) => sum + user.revenue_generated, 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </div>
                            <div className="text-sm text-blue-700">Receita Total</div>
                          </div>
                        </div>
                        
                        <div className="mt-6">
                          <h4 className="font-semibold text-gray-900 mb-3">Média por Usuário</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm text-gray-600">Propostas por usuário:</span>
                              <span className="font-medium">
                                {(topUsers.reduce((sum, user) => sum + user.proposals_count, 0) / topUsers.length).toFixed(1)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm text-gray-600">Receita por usuário:</span>
                              <span className="font-medium">
                                R$ {(topUsers.reduce((sum, user) => sum + user.revenue_generated, 0) / topUsers.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-lg font-medium">Nenhum dado de performance</p>
                          <p className="text-sm">Dados aparecerão quando houver usuários ativos</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="clients" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white rounded-xl border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Top Clientes por Propostas
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
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{client.name}</p>
                                <p className="text-sm text-gray-600">
                                  {client.proposals} {client.proposals === 1 ? 'proposta' : 'propostas'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary" className="text-sm mb-1">
                                #{index + 1}
                              </Badge>
                              {client.revenue && (
                                <p className="text-sm font-medium text-green-600">
                                  R$ {client.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-lg font-medium">Nenhum cliente encontrado</p>
                          <p className="text-sm">Dados aparecerão quando houver propostas cadastradas</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white rounded-xl border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      Análise de Receita
                    </CardTitle>
                    <CardDescription>
                      Performance financeira por cliente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topClients.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="p-4 bg-gradient-to-br from-green-100 to-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-900">
                              R$ {topClients.reduce((sum, client) => sum + (client.revenue || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </div>
                            <div className="text-sm text-green-700">Receita Total</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-900">
                              {topClients.length}
                            </div>
                            <div className="text-sm text-blue-700">Clientes Ativos</div>
                          </div>
                        </div>
                        
                        <div className="mt-6">
                          <h4 className="font-semibold text-gray-900 mb-3">Média por Cliente</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm text-gray-600">Propostas por cliente:</span>
                              <span className="font-medium">
                                {(topClients.reduce((sum, client) => sum + client.proposals, 0) / topClients.length).toFixed(1)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm text-gray-600">Receita por cliente:</span>
                              <span className="font-medium">
                                R$ {(topClients.reduce((sum, client) => sum + (client.revenue || 0), 0) / topClients.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-lg font-medium">Nenhum dado de receita</p>
                          <p className="text-sm">Dados aparecerão quando houver propostas com valores</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Enhanced Export Section */}
          <Card className="bg-white rounded-xl border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary">
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
                <Card className="border-0 bg-white rounded-xl hover:shadow-lg transition-all duration-300 cursor-pointer group" 
                      onClick={() => handleExportReport("financial")}>
                  <CardContent className="p-6 text-center">
                    <div className="p-3 bg-gradient-to-br from-green-100 to-green-50 rounded-xl inline-block mb-4 group-hover:from-green-200 group-hover:to-green-100 transition-all duration-300">
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors duration-300">Relatório Financeiro</h3>
                    <p className="text-sm text-gray-600">Análise de receitas, custos e margem</p>
                  </CardContent>
                </Card>
                
                <Card className="border-0 bg-white rounded-xl hover:shadow-lg transition-all duration-300 cursor-pointer group" 
                      onClick={() => handleExportReport("proposals")}>
                  <CardContent className="p-6 text-center">
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl inline-block mb-4 group-hover:from-blue-200 group-hover:to-blue-100 transition-all duration-300">
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">Relatório de Propostas</h3>
                    <p className="text-sm text-gray-600">Performance e conversão das propostas</p>
                  </CardContent>
                </Card>
                
                <Card className="border-0 bg-white rounded-xl hover:shadow-lg transition-all duration-300 cursor-pointer group" 
                      onClick={() => handleExportReport("inventory")}>
                  <CardContent className="p-6 text-center">
                    <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl inline-block mb-4 group-hover:from-purple-200 group-hover:to-purple-100 transition-all duration-300">
                      <Monitor className="h-8 w-8 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300">Relatório de Inventário</h3>
                    <p className="text-sm text-gray-600">Status e disponibilidade das telas</p>
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