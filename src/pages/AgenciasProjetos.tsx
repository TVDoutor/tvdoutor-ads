import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { validateBackendProjeto, sanitizeBackendProjeto } from "@/utils/validations/backend-projeto-validations";
import type { ProjetoWithDetails } from "@/types/agencia";

export default function AgenciasProjetos() {
  const [projetos, setProjetos] = useState<ProjetoWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjetoWithDetails | null>(null);

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

  useEffect(() => {
    loadProjetos();
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
    <div className="space-y-6">
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
                <Input
                  id="deal_id"
                  value={formData.deal_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, deal_id: e.target.value }))}
                  required
                />
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
                <div className="flex justify-end space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEditModal(projeto)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}