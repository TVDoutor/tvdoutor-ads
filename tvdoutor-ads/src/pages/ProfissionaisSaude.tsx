/**
 * Página de Gestão de Profissionais da Saúde
 * 
 * Permite cadastrar, editar, listar e vincular profissionais com venues
 */

import React, { useState } from 'react';
import {
  useProfissionaisSaude,
  useDeleteProfissional,
  type ProfissionalSaude
} from '@/hooks/useProfissionaisSaude';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Building2,
  UserCheck,
  RefreshCw,
  AlertCircle,
  Stethoscope
} from 'lucide-react';
import { ProfissionalFormDialog } from '@/components/profissionais/ProfissionalFormDialog';
import { ProfissionalVinculoDialog } from '@/components/profissionais/ProfissionalVinculoDialog';
import { VinculosPopover } from '@/components/profissionais/VinculosPopover';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';

export default function ProfissionaisSaude() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfissional, setSelectedProfissional] = useState<ProfissionalSaude | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isVinculoOpen, setIsVinculoOpen] = useState(false);
  const [profissionalToDelete, setProfissionalToDelete] = useState<string | null>(null);

  const { data: profissionais, isLoading, error, refetch } = useProfissionaisSaude();
  const deleteProfissional = useDeleteProfissional();

  // Filtrar profissionais por busca
  const profissionaisFiltrados = profissionais?.filter(prof =>
    prof.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.registro_profissional.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.tipo_profissional.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (profissional: ProfissionalSaude) => {
    setSelectedProfissional(profissional);
    setIsFormOpen(true);
  };

  const handleVincular = (profissional: ProfissionalSaude) => {
    setSelectedProfissional(profissional);
    setIsVinculoOpen(true);
  };

  const handleDelete = async () => {
    if (!profissionalToDelete) return;
    
    await deleteProfissional.mutateAsync(profissionalToDelete);
    setProfissionalToDelete(null);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedProfissional(null);
  };

  const handleCloseVinculo = () => {
    setIsVinculoOpen(false);
    setSelectedProfissional(null);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 p-6">
          <Card className="rounded-2xl shadow-lg">
            <CardContent className="flex items-center justify-center p-12">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Carregando profissionais...</span>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 p-6">
          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Erro ao carregar profissionais</span>
              </div>
              <p className="text-red-600 text-sm mb-4">{(error as Error).message}</p>
              <Button onClick={() => refetch()} className="rounded-xl">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <PageHeader
          title="Profissionais da Saúde"
          subtitle="Gerencie os profissionais da saúde e seus vínculos com unidades de saúde"
          icon={Stethoscope}
          badge={{ 
            label: `${profissionais?.filter(p => p.ativo).length || 0} ativos`, 
            color: "bg-green-500/20 text-white border-green-400/50" 
          }}
          actions={
            <Button
              onClick={() => {
                setSelectedProfissional(null);
                setIsFormOpen(true);
              }}
              className="bg-white text-[#f48220] hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all rounded-2xl font-bold"
            >
              <Plus className="h-5 w-5 mr-2" />
              Novo Profissional
            </Button>
          }
        />

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium">Total de Profissionais</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{profissionais?.length || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-50 rounded-xl">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium">Ativos</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {profissionais?.filter(p => p.ativo).length || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium">Tipos de Profissionais</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {new Set(profissionais?.map(p => p.tipo_profissional)).size || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, registro ou tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Profissionais */}
        <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all rounded-2xl">
          <CardHeader>
            <CardTitle>
              Profissionais Cadastrados ({profissionaisFiltrados?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profissionaisFiltrados && profissionaisFiltrados.length > 0 ? (
              <div className="space-y-4">
                {profissionaisFiltrados.map((profissional) => (
                  <div
                    key={profissional.id}
                    className="p-4 border rounded-2xl hover:bg-gray-50 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold">{profissional.nome}</h3>
                          {profissional.ativo ? (
                            <Badge variant="default" className="bg-green-500">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                          <VinculosPopover 
                            profissionalId={profissional.id} 
                            profissionalNome={profissional.nome}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">Tipo:</span>{' '}
                            <span className="font-medium">{profissional.tipo_profissional}</span>
                          </div>

                          <div>
                            <span className="text-gray-600">Registro:</span>{' '}
                            <span className="font-medium">
                              {profissional.tipo_registro} {profissional.registro_profissional}
                            </span>
                          </div>

                          {profissional.email && (
                            <div>
                              <span className="text-gray-600">Email:</span>{' '}
                              <span className="font-medium">{profissional.email}</span>
                            </div>
                          )}

                          {profissional.telefone && (
                            <div>
                              <span className="text-gray-600">Telefone:</span>{' '}
                              <span className="font-medium">{profissional.telefone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(profissional)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleVincular(profissional)}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Gerenciar Vínculos
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setProfissionalToDelete(profissional.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum profissional encontrado</p>
                {searchTerm && (
                  <p className="text-sm mt-1">Tente ajustar sua busca</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogos */}
      <ProfissionalFormDialog
        profissional={selectedProfissional}
        open={isFormOpen}
        onClose={handleCloseForm}
      />

      <ProfissionalVinculoDialog
        profissional={selectedProfissional}
        open={isVinculoOpen}
        onClose={handleCloseVinculo}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!profissionalToDelete} onOpenChange={() => setProfissionalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este profissional? Esta ação não pode ser desfeita.
              Todos os vínculos com venues também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
