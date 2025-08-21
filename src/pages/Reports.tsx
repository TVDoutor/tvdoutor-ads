import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar,
  Filter,
  Eye,
  DollarSign,
  Users,
  Monitor
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

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");

  const mockUser = {
    name: "João Silva",
    email: "joao@tvdoutorada.com",
    role: "Admin"
  };

  // Mock data for charts
  const revenueData = [
    { name: 'Jan', valor: 180000 },
    { name: 'Fev', valor: 220000 },
    { name: 'Mar', valor: 195000 },
    { name: 'Abr', valor: 270000 },
    { name: 'Mai', valor: 240000 },
    { name: 'Jun', valor: 320000 },
    { name: 'Jul', valor: 290000 },
    { name: 'Ago', valor: 350000 },
    { name: 'Set', valor: 310000 },
    { name: 'Out', valor: 400000 },
    { name: 'Nov', valor: 380000 },
    { name: 'Dez', valor: 450000 },
  ];

  const proposalsData = [
    { name: 'Jan', propostas: 45, aprovadas: 32 },
    { name: 'Fev', propostas: 52, aprovadas: 38 },
    { name: 'Mar', propostas: 48, aprovadas: 35 },
    { name: 'Abr', propostas: 61, aprovadas: 44 },
    { name: 'Mai', propostas: 55, aprovadas: 41 },
    { name: 'Jun', propostas: 67, aprovadas: 49 },
  ];

  const screensByCity = [
    { name: 'São Paulo', value: 420, color: '#8B5CF6' },
    { name: 'Rio de Janeiro', value: 280, color: '#06B6D4' },
    { name: 'Belo Horizonte', value: 150, color: '#10B981' },
    { name: 'Salvador', value: 120, color: '#F59E0B' },
    { name: 'Outras', value: 277, color: '#EF4444' },
  ];

  const topClients = [
    { name: 'Shopping Iguatemi', revenue: 85000, proposals: 12, growth: 15.2 },
    { name: 'Farmácias Droga Raia', revenue: 72000, proposals: 8, growth: 8.7 },
    { name: 'Magazine Luiza', revenue: 68000, proposals: 15, growth: 22.1 },
    { name: 'Posto Ipiranga', revenue: 54000, proposals: 6, growth: -5.3 },
    { name: 'Banco Bradesco', revenue: 48000, proposals: 9, growth: 12.8 },
  ];

  const handleExportReport = (type: string) => {
    console.log(`Exportando relatório: ${type}`);
  };

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
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="1y">Último ano</option>
            </select>
            
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
            
            <Button className="gap-2">
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
                  <p className="text-sm text-muted-foreground">Faturamento Total</p>
                  <p className="text-2xl font-bold">R$ 3.8M</p>
                  <p className="text-sm text-primary">+18.2% vs mês anterior</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Propostas Ativas</p>
                  <p className="text-2xl font-bold">127</p>
                  <p className="text-sm text-secondary">+12.5% vs mês anterior</p>
                </div>
                <Eye className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Aprovação</p>
                  <p className="text-2xl font-bold">73.2%</p>
                  <p className="text-sm text-accent">+5.8% vs mês anterior</p>
                </div>
                <TrendingUp className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Telas Ativas</p>
                  <p className="text-2xl font-bold">1,247</p>
                  <p className="text-sm text-primary">+15 novas este mês</p>
                </div>
                <Monitor className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Faturamento Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`R$ ${Number(value).toLocaleString()}`, 'Faturamento']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Proposals Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-secondary" />
                Propostas por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={proposalsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="propostas" fill="hsl(var(--secondary))" name="Enviadas" />
                  <Bar dataKey="aprovadas" fill="hsl(var(--primary))" name="Aprovadas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Distribution and Top Clients */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Screen Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-accent" />
                Distribuição de Telas por Cidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={screensByCity}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
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
            </CardContent>
          </Card>

          {/* Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Top Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topClients.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {client.proposals} propostas
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">R$ {client.revenue.toLocaleString()}</p>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant={client.growth >= 0 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {client.growth >= 0 ? "+" : ""}{client.growth}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

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