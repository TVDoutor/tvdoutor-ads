import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  UserPlus, 
  Crown, 
  Shield, 
  Target, 
  User,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  Mail,
  Building2,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  EquipeCompleta, 
  EstatisticasEquipe, 
  FuncaoEquipe, 
  equipeService 
} from '@/lib/project-management-service';
import { TeamMemberForm } from './TeamMemberForm';

interface ProjectTeamManagerProps {
  projetoId: string;
  projetoNome: string;
  onTeamUpdate?: () => void;
}

// Configuração das funções com ícones e cores
const FUNCOES_CONFIG = {
  membro: {
    label: 'Membro',
    icon: User,
    color: 'bg-blue-100 text-blue-800',
    borderColor: 'border-blue-200'
  },
  coordenador: {
    label: 'Coordenador',
    icon: Target,
    color: 'bg-green-100 text-green-800',
    borderColor: 'border-green-200'
  },
  gerente: {
    label: 'Gerente',
    icon: Shield,
    color: 'bg-purple-100 text-purple-800',
    borderColor: 'border-purple-200'
  },
  diretor: {
    label: 'Diretor',
    icon: Crown,
    color: 'bg-yellow-100 text-yellow-800',
    borderColor: 'border-yellow-200'
  }
};

export const ProjectTeamManager: React.FC<ProjectTeamManagerProps> = ({
  projetoId,
  projetoNome,
  onTeamUpdate
}) => {
  const [equipe, setEquipe] = useState<EquipeCompleta[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasEquipe>({
    total_membros: 0,
    total_coordenadores: 0,
    total_gerentes: 0,
    total_diretores: 0,
    membros_ativos: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [membroSelecionado, setMembroSelecionado] = useState<EquipeCompleta | null>(null);

  useEffect(() => {
    carregarEquipe();
  }, [projetoId]);

  const carregarEquipe = async () => {
    try {
      setLoading(true);
      
      const [equipeData, statsData] = await Promise.all([
        equipeService.listarPorProjeto(supabase, projetoId),
        equipeService.obterEstatisticas(supabase, projetoId)
      ]);

      setEquipe(equipeData);
      setEstatisticas(statsData);
    } catch (error) {
      console.error('Erro ao carregar equipe:', error);
      toast.error('Erro ao carregar equipe do projeto');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoverMembro = async (membroId: string, nomeMembro: string) => {
    if (!confirm(`Tem certeza que deseja remover ${nomeMembro} da equipe?`)) {
      return;
    }

    try {
      await equipeService.removerMembro(supabase, membroId);
      toast.success(`${nomeMembro} removido da equipe`);
      carregarEquipe();
      onTeamUpdate?.();
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast.error('Erro ao remover membro da equipe');
    }
  };

  const handleAlterarFuncao = async (membroId: string, novaFuncao: FuncaoEquipe) => {
    try {
      await equipeService.atualizarMembro(supabase, membroId, { papel: novaFuncao });
      toast.success('Função do membro atualizada com sucesso');
      carregarEquipe();
      onTeamUpdate?.();
    } catch (error) {
      console.error('Erro ao alterar função:', error);
      toast.error('Erro ao alterar função do membro');
    }
  };

  const getIniciais = (nome: string) => {
    return nome
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Equipe do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Carregando equipe...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Equipe do Projeto
              </CardTitle>
              <CardDescription>
                Gerencie os membros da equipe do projeto: <strong>{projetoNome}</strong>
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddMemberForm(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar Membro
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Estatísticas da Equipe */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Membros</p>
                  <p className="text-2xl font-bold text-gray-900">{estatisticas.total_membros}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Coordenadores</p>
                  <p className="text-2xl font-bold text-green-600">{estatisticas.total_coordenadores}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gerentes</p>
                  <p className="text-2xl font-bold text-purple-600">{estatisticas.total_gerentes}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Diretores</p>
                  <p className="text-2xl font-bold text-yellow-600">{estatisticas.total_diretores}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Crown className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Membros */}
          {equipe.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum membro na equipe</h3>
              <p className="text-gray-600 mb-4">
                Adicione membros à equipe para começar a colaborar no projeto.
              </p>
              <Button onClick={() => setShowAddMemberForm(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Membro
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Membros da Equipe</h3>
              
              <div className="grid gap-4">
                {equipe.map(membro => {
                  const config = FUNCOES_CONFIG[membro.papel];
                  const IconComponent = config.icon;
                  
                  return (
                    <div
                      key={membro.id}
                      className={`p-4 border-2 rounded-lg ${config.borderColor} bg-white hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={membro.avatar_usuario} />
                            <AvatarFallback className="text-sm">
                              {getIniciais(membro.nome_usuario)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">{membro.nome_usuario}</h4>
                              <Badge className={config.color}>
                                <IconComponent className="w-3 h-3 mr-1" />
                                {config.label}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                <span>{membro.email_usuario}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>Entrou em {formatarData(membro.data_entrada)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={membro.papel}
                            onChange={(e) => handleAlterarFuncao(membro.id, e.target.value as FuncaoEquipe)}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {Object.entries(FUNCOES_CONFIG).map(([funcao, config]) => (
                              <option key={funcao} value={funcao}>
                                {config.label}
                              </option>
                            ))}
                          </select>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoverMembro(membro.id, membro.nome_usuario)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Adicionar Membro */}
      {showAddMemberForm && (
        <TeamMemberForm
          projetoId={projetoId}
          projetoNome={projetoNome}
          onMemberAdded={() => {
            carregarEquipe();
            onTeamUpdate?.();
          }}
          onClose={() => setShowAddMemberForm(false)}
        />
      )}
    </>
  );
};

