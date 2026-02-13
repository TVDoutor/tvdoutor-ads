import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { StatsGrid } from '@/components/StatsGrid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Settings, 
  Target, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Save,
  X,
  Calculator
} from 'lucide-react';
import { toast } from 'sonner';
import { ImpactModelsService, ImpactModel, CreateImpactModelData, UpdateImpactModelData } from '@/lib/impact-models-service';
import { useAuth } from '@/contexts/AuthContext';

export default function ImpactModelsAdmin() {
  const { hasRole } = useAuth();
  const [models, setModels] = useState<ImpactModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ImpactModel | null>(null);
  const [usageStats, setUsageStats] = useState<{ formula_id: number; formula_name: string; usage_count: number }[]>([]);

  // Estados para formulário de criação/edição
  const [formData, setFormData] = useState<CreateImpactModelData>({
    name: '',
    description: '',
    traffic_level: 'Médio',
    multiplier: 1.0,
    examples: [],
    color_scheme: {
      gradient: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700'
    }
  });

  // Verificar permissões
  if (!hasRole('admin') && !hasRole('super_admin')) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar fórmulas de impacto.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [modelsData, statsData] = await Promise.all([
        ImpactModelsService.getAllModels(),
        ImpactModelsService.getUsageStats()
      ]);
      
      setModels(modelsData);
      setUsageStats(statsData);
    } catch (err) {
      setError('Erro ao carregar dados das fórmulas');
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await ImpactModelsService.createModel(formData);
      toast.success('Fórmula criada com sucesso!');
      setIsCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      toast.error('Erro ao criar fórmula');
      console.error('Erro ao criar:', err);
    }
  };

  const handleUpdate = async () => {
    if (!editingModel) return;
    
    try {
      await ImpactModelsService.updateModel(editingModel.id, formData);
      toast.success('Fórmula atualizada com sucesso!');
      setIsEditDialogOpen(false);
      setEditingModel(null);
      resetForm();
      loadData();
    } catch (err) {
      toast.error('Erro ao atualizar fórmula');
      console.error('Erro ao atualizar:', err);
    }
  };

  const handleToggleActive = async (model: ImpactModel) => {
    try {
      if (model.active) {
        await ImpactModelsService.deactivateModel(model.id);
        toast.success('Fórmula desativada');
      } else {
        await ImpactModelsService.activateModel(model.id);
        toast.success('Fórmula reativada');
      }
      loadData();
    } catch (err) {
      toast.error('Erro ao alterar status da fórmula');
      console.error('Erro ao alterar status:', err);
    }
  };

  const handleDelete = async (model: ImpactModel) => {
    try {
      const canDelete = await ImpactModelsService.canDeleteModel(model.id);
      if (!canDelete) {
        toast.error('Esta fórmula está sendo usada em propostas e não pode ser excluída');
        return;
      }

      if (confirm(`Tem certeza que deseja excluir a fórmula "${model.name}"?`)) {
        await ImpactModelsService.deleteModel(model.id);
        toast.success('Fórmula excluída com sucesso!');
        loadData();
      }
    } catch (err) {
      toast.error('Erro ao excluir fórmula');
      console.error('Erro ao excluir:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      traffic_level: 'Médio',
      multiplier: 1.0,
      examples: [],
      color_scheme: {
        gradient: 'from-blue-500 to-cyan-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-700'
      }
    });
  };

  const openEditDialog = (model: ImpactModel) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      description: model.description,
      traffic_level: model.traffic_level,
      multiplier: model.multiplier,
      examples: model.examples,
      color_scheme: model.color_scheme
    });
    setIsEditDialogOpen(true);
  };

  const getUsageCount = (modelId: number) => {
    const stat = usageStats.find(s => s.formula_id === modelId);
    return stat?.usage_count || 0;
  };

  const getTrafficLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'alto': return 'bg-green-100 text-green-800';
      case 'médio': return 'bg-blue-100 text-blue-800';
      case 'baixo': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Carregando fórmulas...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        <PageHeader
          icon={Calculator}
          title="Gerenciar Fórmulas de Impacto"
          description="Configure e gerencie as fórmulas de cálculo de impacto para campanhas"
          badges={[
            { label: `${models.length} fórmulas`, variant: "default" }
          ]}
          actions={
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={resetForm}
                  className="bg-white text-[#f48220] hover:bg-white/90 shadow-2xl hover:shadow-white/50 hover:scale-105 transition-all font-bold group"
                >
                  <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform" />
                  Nova Fórmula
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Fórmula de Impacto</DialogTitle>
                <DialogDescription>
                  Defina uma nova fórmula para cálculo de impacto baseada no perfil de tráfego
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome da Fórmula *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Fórmula D"
                    />
                  </div>
                  <div>
                    <Label htmlFor="traffic_level">Nível de Tráfego *</Label>
                    <Select value={formData.traffic_level} onValueChange={(value) => setFormData({ ...formData, traffic_level: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alto">Alto</SelectItem>
                        <SelectItem value="Médio">Médio</SelectItem>
                        <SelectItem value="Baixo">Baixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva para que tipo de locais esta fórmula é adequada"
                  />
                </div>

                <div>
                  <Label htmlFor="multiplier">Multiplicador de Impacto *</Label>
                  <Input
                    id="multiplier"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    value={formData.multiplier}
                    onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) || 1.0 })}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    1.0 = impacto padrão, 1.5 = 50% mais impacto, 0.7 = 30% menos impacto
                  </p>
                </div>

                <div>
                  <Label>Exemplos de Locais</Label>
                  <div className="space-y-2">
                    {formData.examples.map((example, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={example}
                          onChange={(e) => {
                            const newExamples = [...formData.examples];
                            newExamples[index] = e.target.value;
                            setFormData({ ...formData, examples: newExamples });
                          }}
                          placeholder="Ex: Shopping centers movimentados"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newExamples = formData.examples.filter((_, i) => i !== index);
                            setFormData({ ...formData, examples: newExamples });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => setFormData({ ...formData, examples: [...formData.examples, ''] })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Exemplo
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate}>
                  <Save className="h-4 w-4 mr-2" />
                  Criar Fórmula
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          }
        />

        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Fórmula de Impacto</DialogTitle>
                <DialogDescription>
                  Modifique os parâmetros da fórmula selecionada
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Nome da Fórmula *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-traffic_level">Nível de Tráfego *</Label>
                    <Select value={formData.traffic_level} onValueChange={(value) => setFormData({ ...formData, traffic_level: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alto">Alto</SelectItem>
                        <SelectItem value="Médio">Médio</SelectItem>
                        <SelectItem value="Baixo">Baixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-description">Descrição *</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-multiplier">Multiplicador de Impacto *</Label>
                  <Input
                    id="edit-multiplier"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    value={formData.multiplier}
                    onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) || 1.0 })}
                  />
                </div>

                <div>
                  <Label>Exemplos de Locais</Label>
                  <div className="space-y-2">
                    {formData.examples.map((example, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={example}
                          onChange={(e) => {
                            const newExamples = [...formData.examples];
                            newExamples[index] = e.target.value;
                            setFormData({ ...formData, examples: newExamples });
                          }}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newExamples = formData.examples.filter((_, i) => i !== index);
                            setFormData({ ...formData, examples: newExamples });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => setFormData({ ...formData, examples: [...formData.examples, ''] })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Exemplo
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdate}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Error Alert */}
        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12 space-y-8">
          {/* Stats Cards */}
          <StatsGrid
            columns={3}
            stats={[
              {
                title: "Total de Fórmulas",
                value: models.length.toString(),
                subtitle: `${models.filter(m => m.active).length} ativas`,
                icon: Target,
                gradient: "bg-gradient-to-br from-[#f48220] to-[#e67516]",
                badge: { label: "Fórmulas", icon: Calculator }
              },
              {
                title: "Fórmulas em Uso",
                value: usageStats.reduce((sum, stat) => sum + stat.usage_count, 0).toString(),
                subtitle: "Propostas usando fórmulas",
                icon: TrendingUp,
                gradient: "bg-gradient-to-br from-[#ffb87a] to-[#ffc499]",
                badge: { label: "Ativas", icon: CheckCircle }
              },
              {
                title: "Última Atualização",
                value: models.length > 0 ? new Date(Math.max(...models.map(m => new Date(m.updated_at).getTime()))).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-',
                subtitle: "Sistema de fórmulas",
                icon: Settings,
                gradient: "bg-gradient-to-br from-[#ff9d4d] to-[#ffb87a]"
              }
            ]}
          />

          {/* Table */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
            <CardTitle>Fórmulas de Impacto</CardTitle>
            <CardDescription>
              Gerencie todas as fórmulas de cálculo de impacto disponíveis no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Nível de Tráfego</TableHead>
                  <TableHead>Multiplicador</TableHead>
                  <TableHead>Exemplos</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>
                      <Badge className={getTrafficLevelColor(model.traffic_level)}>
                        {model.traffic_level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {model.multiplier}x
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-600 truncate">
                          {model.examples.slice(0, 2).join(', ')}
                          {model.examples.length > 2 && ` +${model.examples.length - 2} mais`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getUsageCount(model.id)} propostas
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {model.active ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Inativa
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(model)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(model)}
                        >
                          {model.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(model)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
