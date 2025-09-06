import { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, User, Mail, Phone, Briefcase, Building } from "lucide-react";
import { PessoasProjetoService } from '@/lib/pessoas-projeto-service';
import { listarAgencias } from '@/lib/agencia-service';
import type { PessoaProjeto, PessoaProjetoInsert, PessoaProjetoUpdate } from '@/types/agencia';
import type { Agencia } from '@/types/agencia';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function PessoasProjeto() {
  const { user } = useAuth();
  const [pessoas, setPessoas] = useState<PessoaProjeto[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPessoa, setEditingPessoa] = useState<PessoaProjeto | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cargo: '',
    agencia_id: ''
  });

  useEffect(() => {
    loadData();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      // Verificar se o usuário é administrador
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();
      
      setIsAdmin(profile?.role === 'admin' || profile?.role === 'super_admin');
    } catch (error) {
      console.error('Erro ao verificar status de admin:', error);
      setIsAdmin(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [pessoasData, agenciasData] = await Promise.all([
        PessoasProjetoService.listar(),
        listarAgencias()
      ]);
      
      setPessoas(pessoasData);
      setAgencias(agenciasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin) {
      toast.error('Apenas administradores podem gerenciar pessoas do projeto');
      return;
    }

    try {
      const pessoaData: PessoaProjetoInsert = {
        nome: formData.nome.trim(),
        email: formData.email.trim() || null,
        telefone: formData.telefone.trim() || null,
        cargo: formData.cargo.trim() || null,
        agencia_id: formData.agencia_id === "null" ? null : formData.agencia_id || null
      };

      if (editingPessoa) {
        await PessoasProjetoService.atualizar(editingPessoa.id, pessoaData);
        toast.success('Pessoa atualizada com sucesso!');
      } else {
        await PessoasProjetoService.criar(pessoaData);
        toast.success('Pessoa criada com sucesso!');
      }

      setModalOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar pessoa:', error);
      toast.error(`Erro ao salvar pessoa: ${error.message}`);
    }
  };

  const handleDelete = async (pessoa: PessoaProjeto) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem remover pessoas do projeto');
      return;
    }

    if (!confirm(`Tem certeza que deseja remover ${pessoa.nome}?`)) {
      return;
    }

    try {
      await PessoasProjetoService.remover(pessoa.id);
      toast.success('Pessoa removida com sucesso!');
      loadData();
    } catch (error: any) {
      console.error('Erro ao remover pessoa:', error);
      toast.error(`Erro ao remover pessoa: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      cargo: '',
      agencia_id: 'null'
    });
    setEditingPessoa(null);
  };

  const openEditModal = (pessoa: PessoaProjeto) => {
    setEditingPessoa(pessoa);
    setFormData({
      nome: pessoa.nome,
      email: pessoa.email || '',
      telefone: pessoa.telefone || '',
      cargo: pessoa.cargo || '',
      agencia_id: pessoa.agencia_id || 'null'
    });
    setModalOpen(true);
  };

  const getAgenciaNome = (agenciaId: string | null) => {
    if (!agenciaId) return 'Não vinculada';
    const agencia = agencias.find(a => a.id === agenciaId);
    return agencia?.nome_agencia || 'Agência não encontrada';
  };

  // Se não for admin, mostrar mensagem de acesso negado
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold text-muted-foreground mb-2">
              Acesso Restrito
            </h2>
            <p className="text-muted-foreground">
              Apenas administradores podem gerenciar pessoas do projeto.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pessoas do Projeto</h1>
          <p className="text-muted-foreground">
            Gerencie os contatos que podem ser responsáveis por projetos
          </p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Pessoa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPessoa ? 'Editar Pessoa' : 'Nova Pessoa'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    required
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                    placeholder="Ex: Gerente de Projetos"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agencia_id">Agência (Opcional)</Label>
                <Select
                  value={formData.agencia_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, agencia_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma agência (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Não vinculada</SelectItem>
                    {agencias.map(agencia => (
                      <SelectItem key={agencia.id} value={agencia.id}>
                        {agencia.nome_agencia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPessoa ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando pessoas...</div>
      ) : (
        <div className="grid gap-4">
          {pessoas.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma pessoa cadastrada</h3>
                <p className="text-muted-foreground mb-4">
                  Comece adicionando pessoas que podem ser responsáveis por projetos.
                </p>
                <Button onClick={() => setModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeira Pessoa
                </Button>
              </CardContent>
            </Card>
          ) : (
            pessoas.map((pessoa) => (
              <Card key={pessoa.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{pessoa.nome}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          {pessoa.cargo && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {pessoa.cargo}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {getAgenciaNome(pessoa.agencia_id)}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => openEditModal(pessoa)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleDelete(pessoa)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pessoa.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{pessoa.email}</span>
                      </div>
                    )}
                    {pessoa.telefone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{pessoa.telefone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
