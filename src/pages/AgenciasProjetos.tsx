import { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Edit, Flag, CheckCircle, Clock, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { validateBackendProjeto, sanitizeBackendProjeto } from "@/utils/validations/backend-projeto-validations";
import type { ProjetoWithDetails, Deal } from "@/types/agencia";
import { PessoaProjetoSelector } from '@/components/PessoaProjetoSelector';

// Tipo para Marco
interface Marco {
  id: string;
  projeto_id: string;
  nome_marco: string;
  descricao?: string;
  data_prevista?: string;
  data_conclusao?: string;
  status: string;
  responsavel_id?: string;
  ordem?: number;
  created_at?: string;
  created_by?: string;
}

export default function AgenciasProjetos() {
  const [projetos, setProjetos] = useState<ProjetoWithDetails[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [marcos, setMarcos] = useState<Marco[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjetoWithDetails | null>(null);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Marco | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

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

  const [milestoneFormData, setMilestoneFormData] = useState({
    nome_marco: '',
    descricao: '',
    data_prevista: '',
    ordem: 1,
    status: 'pendente' as const
  });

  useEffect(() => {
    loadProjetos();
    loadDeals();
    loadMarcos();
  }, []);

  const loadProjetos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vw_projetos_completos')
        .select('*');

      if (error) throw error;
      setProjetos(data || []);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast.error('Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  };

  const loadDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('agencia_deals')
        .select(`
          id,
          nome_deal,
          agencia_id,
          agencias!inner(nome_agencia)
        `);

      if (error) throw error;
      
      const dealsWithAgencia = (data || []).map(deal => ({
        id: deal.id,
        agencia_id: deal.agencia_id,
        nome_deal: deal.nome_deal,
        status: 'ativo',
        created_at: new Date().toISOString(),
        agencia_nome: deal.agencias?.nome_agencia || 'Agência não encontrada'
      }));
      
      setDeals(dealsWithAgencia);
    } catch (error) {
      console.error('Erro ao carregar deals:', error);
      toast.error('Erro ao carregar deals');
    }
  };

  const loadMarcos = async () => {
    try {
      const { data, error } = await supabase
        .from('agencia_projeto_marcos')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      setMarcos(data || []);
    } catch (error) {
      console.error('Erro ao carregar marcos:', error);
      toast.error('Erro ao carregar marcos');
    }
  };

  const criarProjeto = async (data: any) => {
    const { error } = await supabase
      .from('agencia_projetos')
      .insert({
        ...data,
        descricao: data.descricao || null,
        data_inicio: data.data_inicio || null,
        data_fim: data.data_fim || null,
        responsavel_projeto: data.responsavel_projeto || null,
        observacoes: data.observacoes || null
      });
    return { error };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const sanitizedData = sanitizeBackendProjeto(formData);
    const validationResult = await validateBackendProjeto(sanitizedData);
    
    if (!validationResult.success) {
      if (validationResult.errors) {
        Object.entries(validationResult.errors).forEach(([field, message]) => {
          toast.error(`${field}: ${message}`);
        });
      }
      return;
    }

    const validatedData = validationResult.data;
    if (!validatedData) {
      toast.error('Dados inválidos');
      return;
    }

    try {
      const dataToSave = {
        nome_projeto: validatedData.nome_projeto,
        descricao: validatedData.descricao || undefined,
        data_inicio: validatedData.data_inicio || undefined,
        data_fim: validatedData.data_fim || undefined,
        deal_id: validatedData.deal_id,
        status_projeto: validatedData.status_projeto,
        orcamento_projeto: validatedData.orcamento_projeto,
        responsavel_projeto: validatedData.responsavel_projeto || undefined,
        observacoes: validatedData.observacoes || undefined,
        prioridade: validatedData.prioridade,
        tipo_projeto: validatedData.tipo_projeto
      };

      if (editingProject) {
        const { error } = await supabase
          .from('agencia_projetos')
          .update(dataToSave)
          .eq('id', editingProject.id);

        if (error) throw error;
        toast.success('Projeto atualizado com sucesso!');
      } else {
        const { error } = await criarProjeto(dataToSave);
        if (error) throw error;
        toast.success('Projeto criado com sucesso!');
      }

      setModalOpen(false);
      resetForm();
      loadProjetos();
    } catch (error: any) {
      console.error('Erro ao salvar projeto:', error);
      toast.error(`Erro ao salvar projeto: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      nome_projeto: '',
      descricao: '',
      data_inicio: '',
      data_fim: '',
      deal_id: '',
      status_projeto: 'planejamento',
      orcamento_projeto: '',
      responsavel_projeto: '',
      observacoes: '',
      prioridade: 'media',
      tipo_projeto: 'campanha'
    });
    setEditingProject(null);
  };

  const resetMilestoneForm = () => {
    setMilestoneFormData({
      nome_marco: '',
      descricao: '',
      data_prevista: '',
      ordem: 1,
      status: 'pendente'
    });
    setEditingMilestone(null);
    setSelectedProjectId('');
  };

  const openMilestoneModal = (projectId: string, milestone?: Marco) => {
    setSelectedProjectId(projectId);
    if (milestone) {
      setEditingMilestone(milestone);
      setMilestoneFormData({
        nome_marco: milestone.nome_marco,
        descricao: milestone.descricao || '',
        data_prevista: milestone.data_prevista || '',
        ordem: milestone.ordem || 1,
        status: milestone.status as 'pendente' | 'em_andamento' | 'concluido'
      });
    } else {
      resetMilestoneForm();
    }
    setMilestoneModalOpen(true);
  };

  const handleMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...milestoneFormData,
        projeto_id: selectedProjectId,
        ordem: parseInt(milestoneFormData.ordem.toString())
      };

      if (editingMilestone) {
        const { error } = await supabase
          .from('agencia_projeto_marcos')
          .update(dataToSave)
          .eq('id', editingMilestone.id);

        if (error) throw error;
        toast.success('Marco atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('agencia_projeto_marcos')
          .insert([dataToSave]);

        if (error) throw error;
        toast.success('Marco criado com sucesso!');
      }

      setMilestoneModalOpen(false);
      resetMilestoneForm();
      loadMarcos();
    } catch (error: any) {
      console.error('Erro ao salvar marco:', error);
      toast.error(`Erro ao salvar marco: ${error.message}`);
    }
  };

  const getMarcosByProject = (projectId: string) => {
    return marcos.filter(marco => marco.projeto_id === projectId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'em_andamento':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'bg-green-100 text-green-800';
      case 'em_andamento':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const openEditModal = (projeto: ProjetoWithDetails) => {
    setEditingProject(projeto);
    setFormData({
      nome_projeto: projeto.nome_projeto,
      descricao: projeto.descricao || '',
      data_inicio: projeto.data_inicio || '',
      data_fim: projeto.data_fim || '',
      deal_id: projeto.deal_id,
      status_projeto: (projeto.status_projeto || 'planejamento') as any,
      orcamento_projeto: projeto.orcamento_projeto?.toString() || '',
      responsavel_projeto: projeto.responsavel_projeto || '',
      observacoes: projeto.observacoes || '',
      prioridade: (projeto.prioridade || 'media') as any,
      tipo_projeto: (projeto.tipo_projeto || 'campanha') as any
    });
    setModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projetos das Agências</h1>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome_projeto">Nome do Projeto</Label>
                <Input
                  id="nome_projeto"
                  value={formData.nome_projeto}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome_projeto: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deal_id">Deal</Label>
                <select
                  id="deal_id"
                  value={formData.deal_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, deal_id: e.target.value }))}
                  required
                  className="w-full p-2 border rounded"
                >
                  <option value="">Selecione um deal...</option>
                  {deals.map(deal => (
                    <option key={deal.id} value={deal.id}>
                      {deal.nome_deal} - {deal.agencia_nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data de Início</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_inicio: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_fim">Data de Fim</Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_fim: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responsavel_projeto">Responsável do Projeto</Label>
                  <PessoaProjetoSelector
                    value={formData.responsavel_projeto}
                    onValueChange={(value) => setFormData({...formData, responsavel_projeto: value})}
                    placeholder="Selecione o responsável"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProject ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center">Carregando...</div>
      ) : (
        <div className="grid gap-4">
          {projetos.map((projeto) => (
            <Card key={projeto.id}>
              <CardHeader>
                <CardTitle>{projeto.nome_projeto}</CardTitle>
                <CardDescription>{projeto.descricao}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Marcos do Projeto */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Flag className="w-4 h-4" />
                      Marcos do Projeto ({getMarcosByProject(projeto.id).length})
                    </h4>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => openMilestoneModal(projeto.id)}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Novo Marco
                    </Button>
                  </div>
                  
                  {getMarcosByProject(projeto.id).length > 0 ? (
                    <div className="space-y-2">
                      {getMarcosByProject(projeto.id).map((marco) => (
                        <div key={marco.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(marco.status)}
                            <span className="text-sm font-medium">{marco.nome_marco}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(marco.status)}`}>
                            {marco.status}
                          </span>
                          {marco.data_prevista && (
                            <span className="text-xs text-gray-500">
                              Prazo: {new Date(marco.data_prevista).toLocaleDateString()}
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openMilestoneModal(projeto.id, marco)}
                            className="ml-auto h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Nenhum marco criado ainda
                    </div>
                  )}
                </div>

                {/* Botões de Ação */}
                <div className="flex justify-end space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEditModal(projeto)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Editar Projeto
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal para Criar/Editar Marco */}
      <Dialog open={milestoneModalOpen} onOpenChange={setMilestoneModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMilestone ? 'Editar Marco' : 'Novo Marco'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMilestoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome_marco">Nome do Marco</Label>
              <Input
                id="nome_marco"
                value={milestoneFormData.nome_marco}
                onChange={(e) => setMilestoneFormData(prev => ({ ...prev, nome_marco: e.target.value }))}
                required
                placeholder="Ex: Kick-off, Aprovação, Entrega"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao_marco">Descrição</Label>
              <Textarea
                id="descricao_marco"
                value={milestoneFormData.descricao}
                onChange={(e) => setMilestoneFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição detalhada do marco"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_prevista">Data Prevista</Label>
                <Input
                  id="data_prevista"
                  type="date"
                  value={milestoneFormData.data_prevista}
                  onChange={(e) => setMilestoneFormData(prev => ({ ...prev, data_prevista: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ordem">Ordem</Label>
                <Input
                  id="ordem"
                  type="number"
                  min="1"
                  value={milestoneFormData.ordem}
                  onChange={(e) => setMilestoneFormData(prev => ({ ...prev, ordem: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            {editingMilestone && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={milestoneFormData.status}
                  onChange={(e) => setMilestoneFormData(prev => ({ ...prev, status: e.target.value as 'pendente' | 'em_andamento' | 'concluido' }))}
                  className="w-full p-2 border rounded"
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setMilestoneModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingMilestone ? 'Atualizar Marco' : 'Criar Marco'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}