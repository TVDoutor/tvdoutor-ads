import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Calendar, Building2, FolderOpen, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AgenciaSelect } from '@/components/AgenciaSelect';
import type { Agencia, Deal, Projeto } from '@/types/agencia';
import { validateProjeto, sanitizeProjeto, fieldValidations } from '@/utils/validations/projeto-validations';
import { criarProjeto, atualizarProjeto, excluirProjeto } from '@/lib/agencia-service';

interface ProjetoWithDetails extends Projeto {
  agencia_nome?: string;
  deal_nome?: string;
}

export default function AgenciasProjetos() {
  const [projetos, setProjetos] = useState<ProjetoWithDetails[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgencia, setSelectedAgencia] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProjeto, setEditingProjeto] = useState<ProjetoWithDetails | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nome_projeto: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    deal_id: '',
    status_projeto: 'planejamento' as const,
    orcamento_projeto: '',
    responsavel_projeto: '',
    observacoes: '',
    prioridade: 'media' as const,
    tipo_projeto: 'campanha' as const
  });
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar agências
      const { data: agenciasData, error: agenciasError } = await supabase
        .from('agencias')
        .select('*')
        .order('nome_agencia');
      
      if (agenciasError) throw agenciasError;
      setAgencias(agenciasData || []);
      
      // Carregar projetos com informações das agências e deals
      const { data: projetosData, error: projetosError } = await supabase
        .from('agencia_projetos')
        .select(`
          *,
          agencia_deals!inner(
            nome_deal,
            agencia_id,
            agencias!inner(nome_agencia)
          )
        `)
        .order('nome_projeto');
      
      if (projetosError) throw projetosError;
      
      const projetosFormatted = (projetosData || []).map(projeto => ({
        ...projeto,
        agencia_nome: projeto.agencia_deals?.agencias?.nome_agencia,
        deal_nome: projeto.agencia_deals?.nome_deal
      }));
      
      setProjetos(projetosFormatted);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadDeals = async (agenciaId: string) => {
    try {
      const { data, error } = await supabase
        .from('agencia_deals')
        .select('*')
        .eq('agencia_id', agenciaId)
        .order('nome_deal');
      
      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Erro ao carregar deals:', error);
      toast.error('Erro ao carregar deals');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limpar erros anteriores
    setValidationErrors({});
    setIsSubmitting(true);
    
    try {
      // Sanitizar dados de entrada
      const sanitizedData = sanitizeProjeto(formData);
      
      // Validar dados usando Zod
      const validation = validateProjeto(sanitizedData);
      
      if (!validation.success) {
        setValidationErrors(validation.errors || {});
        toast.error('Por favor, corrija os erros no formulário');
        return;
      }
      
      const validatedData = validation.data;
      
      // Preparar dados para o banco
      // Na função de submit do formulário, adicione verificação antes de chamar atualizarProjeto:
      const dbData = {
      nome_projeto: validatedData.nome_projeto,
      descricao: validatedData.descricao,
      data_inicio: validatedData.data_inicio,
      data_fim: validatedData.data_fim,
      deal_id: validatedData.deal_id,
      status_projeto: validatedData.status_projeto,
      orcamento_projeto: validatedData.orcamento_projeto,
      responsavel_projeto: validatedData.responsavel_projeto,
      observacoes: validatedData.observacoes,
      prioridade: validatedData.prioridade,
      tipo_projeto: validatedData.tipo_projeto
      };
      
      // Remover campos undefined/null se necessário
      Object.keys(dbData).forEach(key => {
      if (dbData[key] === undefined) {
      delete dbData[key];
      }
      });
      
      if (editingProjeto) {
        // Atualizar projeto existente usando função do backend com validações
        await atualizarProjeto(editingProjeto.id, dbData);
        toast.success('Projeto atualizado com sucesso!');
      } else {
        // Criar novo projeto usando função do backend com validações
        await criarProjeto(dbData);
        toast.success('Projeto criado com sucesso!');
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadData();
      
    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao salvar projeto';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (projeto: ProjetoWithDetails) => {
    setEditingProjeto(projeto);
    setFormData({
      nome_projeto: projeto.nome_projeto,
      descricao: projeto.descricao || '',
      data_inicio: projeto.data_inicio || '',
      data_fim: projeto.data_fim || '',
      deal_id: projeto.deal_id,
      status_projeto: projeto.status_projeto || 'planejamento',
      orcamento_projeto: projeto.orcamento_projeto?.toString() || '',
      responsavel_projeto: projeto.responsavel_projeto || '',
      observacoes: projeto.observacoes || '',
      prioridade: projeto.prioridade || 'media',
      tipo_projeto: projeto.tipo_projeto || 'campanha'
    });
    
    // Carregar deals da agência do projeto
    const agenciaId = agencias.find(a => a.nome_agencia === projeto.agencia_nome)?.id;
    if (agenciaId) {
      loadDeals(agenciaId);
    }
    
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
    
    try {
      // Usar função do backend com validações
      await excluirProjeto(id);
      toast.success('Projeto excluído com sucesso!');
      loadData();
    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      toast.error('Erro ao excluir projeto');
    }
  };

  const resetForm = () => {
    setFormData({
      nome_projeto: '',
      descricao: '',
      data_inicio: '',
      data_fim: '',
      deal_id: '',
      status_projeto: 'planejamento' as const,
      orcamento_projeto: '',
      responsavel_projeto: '',
      observacoes: '',
      prioridade: 'media' as const,
      tipo_projeto: 'campanha' as const
    });
    setEditingProjeto(null);
    setValidationErrors({});
    setIsSubmitting(false);
    setDeals([]);
  };

  // Função para validação em tempo real de campos individuais
  const validateField = (fieldName: string, value: string) => {
    const fieldValidation = fieldValidations[fieldName as keyof typeof fieldValidations];
    if (fieldValidation) {
      const result = fieldValidation.safeParse(value);
      if (!result.success) {
        setValidationErrors(prev => ({
          ...prev,
          [fieldName]: result.error.errors[0]?.message || 'Valor inválido'
        }));
      } else {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
    }
  };

  // Função para lidar com mudanças nos campos com validação
  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Validar apenas se o campo já foi tocado (tem erro ou valor)
    if (validationErrors[fieldName] || value) {
      validateField(fieldName, value);
    }
  };

  const filteredProjetos = projetos.filter(projeto => {
    const matchesSearch = projeto.nome_projeto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         projeto.agencia_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         projeto.deal_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAgencia = !selectedAgencia || projeto.agencia_nome === selectedAgencia;
    return matchesSearch && matchesAgencia;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não definida';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projetos das Agências</h1>
            <p className="text-gray-600 mt-2">
              Gerencie os projetos vinculados às agências e seus deals
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingProjeto ? 'Editar Projeto' : 'Novo Projeto'}
                </DialogTitle>
                <DialogDescription>
                  {editingProjeto ? 'Atualize as informações do projeto' : 'Crie um novo projeto para uma agência'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome_projeto">Nome do Projeto *</Label>
                    <Input
                      id="nome_projeto"
                      value={formData.nome_projeto}
                      onChange={(e) => handleFieldChange('nome_projeto', e.target.value)}
                      placeholder="Digite o nome do projeto"
                      required
                      className={validationErrors.nome_projeto ? 'border-red-500' : ''}
                    />
                    {validationErrors.nome_projeto && (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>{validationErrors.nome_projeto}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="deal_id">Deal *</Label>
                    <Select
                      value={formData.deal_id}
                      onValueChange={(value) => handleFieldChange('deal_id', value)}
                    >
                      <SelectTrigger className={validationErrors.deal_id ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Selecione um deal" />
                      </SelectTrigger>
                      <SelectContent>
                        {deals.map((deal) => (
                          <SelectItem key={deal.id} value={deal.id}>
                            {deal.nome_deal}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.deal_id && (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>{validationErrors.deal_id}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => handleFieldChange('descricao', e.target.value)}
                    placeholder="Descreva o projeto"
                    rows={3}
                    className={validationErrors.descricao ? 'border-red-500' : ''}
                  />
                  {validationErrors.descricao && (
                    <div className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>{validationErrors.descricao}</span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data_inicio">Data de Início</Label>
                    <Input
                      id="data_inicio"
                      type="date"
                      value={formData.data_inicio}
                      onChange={(e) => handleFieldChange('data_inicio', e.target.value)}
                      className={validationErrors.data_inicio ? 'border-red-500' : ''}
                    />
                    {validationErrors.data_inicio && (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>{validationErrors.data_inicio}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="data_fim">Data de Fim</Label>
                    <Input
                      id="data_fim"
                      type="date"
                      value={formData.data_fim}
                      onChange={(e) => handleFieldChange('data_fim', e.target.value)}
                      className={validationErrors.data_fim ? 'border-red-500' : ''}
                    />
                    {validationErrors.data_fim && (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>{validationErrors.data_fim}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status_projeto">Status do Projeto</Label>
                    <Select
                      value={formData.status_projeto}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status_projeto: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planejamento">Planejamento</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="pausado">Pausado</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select
                      value={formData.prioridade}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, prioridade: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="critica">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_projeto">Tipo de Projeto</Label>
                    <Select
                      value={formData.tipo_projeto}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_projeto: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="campanha">Campanha</SelectItem>
                        <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                        <SelectItem value="consultoria">Consultoria</SelectItem>
                        <SelectItem value="treinamento">Treinamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="orcamento_projeto">Orçamento (R$)</Label>
                    <Input
                      id="orcamento_projeto"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.orcamento_projeto}
                      onChange={(e) => handleFieldChange('orcamento_projeto', e.target.value)}
                      placeholder="0,00"
                      className={validationErrors.orcamento_projeto ? 'border-red-500' : ''}
                    />
                    {validationErrors.orcamento_projeto && (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>{validationErrors.orcamento_projeto}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="responsavel_projeto">Responsável pelo Projeto</Label>
                  <Input
                    id="responsavel_projeto"
                    value={formData.responsavel_projeto}
                    onChange={(e) => handleFieldChange('responsavel_projeto', e.target.value)}
                    placeholder="Nome do responsável"
                    className={validationErrors.responsavel_projeto ? 'border-red-500' : ''}
                  />
                  {validationErrors.responsavel_projeto && (
                    <div className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>{validationErrors.responsavel_projeto}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => handleFieldChange('observacoes', e.target.value)}
                    placeholder="Observações adicionais sobre o projeto"
                    rows={3}
                    className={validationErrors.observacoes ? 'border-red-500' : ''}
                  />
                  {validationErrors.observacoes && (
                    <div className="flex items-center gap-1 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>{validationErrors.observacoes}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isSubmitting || Object.keys(validationErrors).length > 0}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingProjeto ? 'Atualizando...' : 'Criando...'}
                      </>
                    ) : (
                      <>{editingProjeto ? 'Atualizar' : 'Criar'} Projeto</>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar projetos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedAgencia} onValueChange={setSelectedAgencia}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filtrar por agência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as agências</SelectItem>
                  {agencias.map((agencia) => (
                    <SelectItem key={agencia.id} value={agencia.nome_agencia}>
                      {agencia.nome_agencia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando projetos...</p>
          </div>
        ) : filteredProjetos.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto encontrado</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedAgencia ? 'Tente ajustar os filtros de busca' : 'Comece criando seu primeiro projeto'}
              </p>
              {!searchTerm && !selectedAgencia && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Projeto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjetos.map((projeto) => (
              <Card key={projeto.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{projeto.nome_projeto}</CardTitle>
                      <CardDescription className="mt-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="h-3 w-3" />
                          {projeto.agencia_nome}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant="secondary">{projeto.deal_nome}</Badge>
                      {projeto.status_projeto && (
                        <Badge 
                          variant={projeto.status_projeto === 'concluido' ? 'default' : 
                                  projeto.status_projeto === 'em_andamento' ? 'secondary' : 
                                  projeto.status_projeto === 'pausado' ? 'destructive' : 'outline'}
                        >
                          {projeto.status_projeto.replace('_', ' ').toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {projeto.descricao && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {projeto.descricao}
                    </p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">Início:</span>
                      <span>{formatDate(projeto.data_inicio)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">Fim:</span>
                      <span>{formatDate(projeto.data_fim)}</span>
                    </div>
                    {projeto.tipo_projeto && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Tipo:</span>
                        <span className="capitalize">{projeto.tipo_projeto}</span>
                      </div>
                    )}
                    {projeto.prioridade && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Prioridade:</span>
                        <Badge 
                          size="sm"
                          variant={projeto.prioridade === 'critica' ? 'destructive' : 
                                  projeto.prioridade === 'alta' ? 'default' : 'outline'}
                        >
                          {projeto.prioridade.charAt(0).toUpperCase() + projeto.prioridade.slice(1)}
                        </Badge>
                      </div>
                    )}
                    {projeto.orcamento_projeto && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Orçamento:</span>
                        <span className="font-medium">R$ {Number(projeto.orcamento_projeto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {projeto.responsavel_projeto && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Responsável:</span>
                        <span>{projeto.responsavel_projeto}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(projeto)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(projeto.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}