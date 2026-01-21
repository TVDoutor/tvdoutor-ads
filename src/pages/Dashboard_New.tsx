import { 
  FileText, Plus, AlertTriangle, 
  TrendingUp, CheckCircle, Building2, Monitor,
  BarChart3, Users, Stethoscope, Settings,
  Clock, ArrowRight, Package
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStatsWithFallback } from "@/hooks/useDashboardStats";
import { RecentProposals } from "@/components/RecentProposals";
import { AlertsCenterLimited } from "@/components/AlertsCenterLimited";

const Dashboard_New = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: stats, isLoading: loading } = useDashboardStatsWithFallback();

  // Formata o nome para exibir Nome + Sobrenome com primeira letra maiúscula
  const formatName = (name: string | undefined) => {
    if (!name) return 'Usuário';
    
    // Se for um email ou username, tenta extrair o nome
    if (name.includes('@') || name.includes('.')) {
      const parts = name.split(/[@.]/);
      const firstName = parts[0] || '';
      const lastName = parts[1] || '';
      return `${capitalize(firstName)} ${capitalize(lastName)}`.trim();
    }
    
    // Se já for um nome completo, apenas capitaliza
    return name.split(' ').map(capitalize).join(' ');
  };

  const capitalize = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const displayName = formatName(profile?.name || profile?.email);

  const quickActions = [
    { icon: Monitor, label: "Inventário", path: "/inventory", color: "text-orange-600 bg-orange-50" },
    { icon: BarChart3, label: "Relatórios", path: "/reports", color: "text-orange-600 bg-orange-50" },
    { icon: Stethoscope, label: "Profissionais", path: "/profissionais-saude", color: "text-orange-600 bg-orange-50" },
    { icon: Settings, label: "Ajustes", path: "/settings", color: "text-orange-600 bg-orange-50" },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
            <p className="text-gray-600">Carregando dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header com Saudação */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 md:p-8 rounded-b-3xl shadow-xl">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm font-medium">BEM-VINDO,</p>
                <h1 className="text-white text-3xl md:text-4xl font-bold mt-1">
                  {displayName}
                </h1>
              </div>
              <Badge className="bg-green-500/20 text-white border-green-400/50 backdrop-blur-sm px-4 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2" />
                Online
              </Badge>
            </div>
            
            <h2 className="text-white text-2xl font-bold mt-6">Dashboard</h2>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
          
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total de Propostas */}
            <Card className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <FileText className="h-6 w-6 text-orange-600" />
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12%
                  </Badge>
                </div>
                <h3 className="text-gray-600 text-sm font-medium">Total de Propostas</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats?.totalProposals || 6}
                </p>
                <p className="text-xs text-gray-500 mt-1">propostas</p>
              </CardContent>
            </Card>

            {/* Propostas Aceitas */}
            <Card className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +8%
                  </Badge>
                </div>
                <h3 className="text-gray-600 text-sm font-medium">Aceitas</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats?.acceptedProposals || 1}
                </p>
                <p className="text-xs text-gray-500 mt-1">fechadas</p>
              </CardContent>
            </Card>

            {/* Taxa de Conversão */}
            <Card className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                    16.7%
                  </Badge>
                </div>
                <h3 className="text-gray-600 text-sm font-medium">Taxa de Conversão</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">0%</p>
                <p className="text-xs text-gray-500 mt-1">Propostas aceitas vs total</p>
              </CardContent>
            </Card>

            {/* Agências Ativas */}
            <Card className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                    1 novas
                  </Badge>
                </div>
                <h3 className="text-gray-600 text-sm font-medium">Agências Ativas</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats?.totalAgencies || 7}
                </p>
                <p className="text-xs text-gray-500 mt-1">parceiros</p>
              </CardContent>
            </Card>
          </div>

          {/* Botão Nova Proposta */}
          <Button
            onClick={() => navigate('/nova-proposta')}
            size="lg"
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 h-14 text-base font-bold rounded-2xl"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nova Proposta
          </Button>

          {/* Centro de Alertas */}
          <Card className="bg-red-50/50 border-red-200 shadow-lg hover:shadow-xl transition-shadow rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Centro de Alertas (12)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AlertsCenterLimited />
            </CardContent>
          </Card>

          {/* Propostas Recentes */}
          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Propostas Recentes
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/propostas')}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  Ver Todas
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <RecentProposals />
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ações Rápidas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <Card
                  key={index}
                  className="bg-white border-0 shadow-md hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1 rounded-2xl"
                  onClick={() => navigate(action.path)}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className={`p-4 rounded-2xl ${action.color} group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-8 w-8" />
                    </div>
                    <p className="mt-3 font-semibold text-gray-900 text-sm">{action.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard_New;
