// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  UserPlus, 
  Users, 
  Crown, 
  Shield, 
  Target, 
  User,
  X,
  Calendar,
  Mail,
  Phone,
  Building2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FuncaoEquipe, equipeService } from '@/lib/project-management-service';
import { PessoasProjetoService } from '@/lib/pessoas-projeto-service';
import type { PessoaProjeto } from '@/types/agencia';

interface Usuario {
  id: string;
  nome: string;
  email: string | null;
  telefone?: string | null;
  cargo?: string | null;
  avatar_url?: string;
}

interface TeamMemberFormProps {
  projetoId: string;
  projetoNome: string;
  onMemberAdded: () => void;
  onClose: () => void;
}

// Configuração das funções com ícones e cores
const FUNCOES_CONFIG = {
  membro: {
    label: 'Membro',
    icon: User,
    color: 'bg-blue-100 text-blue-800',
    description: 'Membro da equipe com acesso básico ao projeto'
  },
  coordenador: {
    label: 'Coordenador',
    icon: Target,
    color: 'bg-green-100 text-green-800',
    description: 'Coordenador responsável por organizar atividades'
  },
  gerente: {
    label: 'Gerente',
    icon: Shield,
    color: 'bg-purple-100 text-purple-800',
    description: 'Gerente com responsabilidades de gestão e tomada de decisões'
  },
  diretor: {
    label: 'Diretor',
    icon: Crown,
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Diretor com autoridade máxima no projeto'
  }
};

export const TeamMemberForm: React.FC<TeamMemberFormProps> = ({
  projetoId,
  projetoNome,
  onMemberAdded,
  onClose
}) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState('');
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [funcaoSelecionada, setFuncaoSelecionada] = useState<FuncaoEquipe>('membro');
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(true);

  // Carregar usuários disponíveis
  useEffect(() => {
    carregarUsuarios();
  }, []);

  // Filtrar usuários baseado na busca
  useEffect(() => {
    if (!busca.trim()) {
      setUsuariosFiltrados(usuarios);
    } else {
      const filtrados = usuarios.filter(usuario =>
        usuario.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (usuario.email && usuario.email.toLowerCase().includes(busca.toLowerCase()))
      );
      setUsuariosFiltrados(filtrados);
    }
  }, [busca, usuarios]);

  const carregarUsuarios = async () => {
    try {
      setCarregandoUsuarios(true);
      
      console.log('🔍 Tentando carregar pessoas da tabela pessoas_projeto...');
      
      // Tentar buscar da tabela pessoas_projeto primeiro
      try {
        const pessoasData = await PessoasProjetoService.listar();
        console.log('✅ Pessoas carregadas da tabela pessoas_projeto:', pessoasData.length);
        
        // Verificar quais pessoas já estão na equipe
        const { data: membrosExistentes } = await supabase
          .from('agencia_projeto_equipe')
          .select('pessoa_id')
          .eq('projeto_id', projetoId)
          .eq('ativo', true);

        const idsMembrosExistentes = new Set(membrosExistentes?.map(m => m.pessoa_id) || []);
        
        // Filtrar pessoas que não estão na equipe e converter para formato Usuario
        const usuariosDisponiveis = pessoasData
          .filter(pessoa => !idsMembrosExistentes.has(pessoa.id))
          .map(pessoa => ({
            id: pessoa.id,
            nome: pessoa.nome,
            email: pessoa.email,
            telefone: pessoa.telefone,
            cargo: pessoa.cargo,
            avatar_url: undefined // pessoas_projeto não tem avatar_url
          }));
        
        console.log('✅ Usuários disponíveis (pessoas_projeto):', usuariosDisponiveis.length);
        setUsuarios(usuariosDisponiveis);
        setUsuariosFiltrados(usuariosDisponiveis);
        return;
        
      } catch (pessoasError) {
        console.warn('⚠️ Erro ao carregar pessoas_projeto, tentando profiles:', pessoasError);
        
        // Fallback: buscar da tabela profiles se pessoas_projeto não existir
        const { data: usuariosData, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .order('full_name');

        if (error) throw error;

        // Verificar quais usuários já estão na equipe
        const { data: membrosExistentes } = await supabase
          .from('agencia_projeto_equipe')
          .select('pessoa_id')
          .eq('projeto_id', projetoId)
          .eq('ativo', true);

        const idsMembrosExistentes = new Set(membrosExistentes?.map(m => m.pessoa_id) || []);
        
        // Filtrar usuários que não estão na equipe e converter para formato Usuario
        const usuariosDisponiveis = usuariosData
          ?.filter(u => !idsMembrosExistentes.has(u.id))
          .map(u => ({
            id: u.id,
            nome: u.full_name,
            email: u.email,
            telefone: null,
            cargo: null,
            avatar_url: u.avatar_url
          })) || [];
        
        console.log('✅ Usuários disponíveis (profiles fallback):', usuariosDisponiveis.length);
        setUsuarios(usuariosDisponiveis);
        setUsuariosFiltrados(usuariosDisponiveis);
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários disponíveis');
    } finally {
      setCarregandoUsuarios(false);
    }
  };

  const handleAdicionarMembro = async () => {
    if (!usuarioSelecionado) {
      toast.error('Selecione um usuário');
      return;
    }

    try {
      setLoading(true);

      // Verificar se o usuário já está na equipe
      const jaExiste = await equipeService.verificarMembroExistente(
        supabase, 
        projetoId, 
        usuarioSelecionado.id
      );

      if (jaExiste) {
        toast.error('Este usuário já está na equipe do projeto');
        return;
      }

      // Adicionar membro à equipe
      await equipeService.adicionarMembro(supabase, {
        projeto_id: projetoId,
        pessoa_id: usuarioSelecionado.id,
        papel: funcaoSelecionada,
        data_entrada: dataEntrada
      });

      toast.success(`${usuarioSelecionado.nome} adicionado à equipe como ${FUNCOES_CONFIG[funcaoSelecionada].label}`);
      onMemberAdded();
      onClose();
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      toast.error('Erro ao adicionar membro à equipe');
    } finally {
      setLoading(false);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Adicionar Membro à Equipe
              </CardTitle>
              <CardDescription>
                Adicione um novo membro ao projeto: <strong>{projetoNome}</strong>
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Seleção de Usuário */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Selecionar Pessoa</Label>
            
            <div className="space-y-3">
              <Input
                placeholder="Buscar por nome ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full"
              />

              {carregandoUsuarios ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Carregando pessoas...</span>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {usuariosFiltrados.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {busca ? 'Nenhuma pessoa encontrada' : 'Nenhuma pessoa disponível'}
                    </div>
                  ) : (
                    usuariosFiltrados.map(usuario => (
                      <div
                        key={usuario.id}
                        className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                          usuarioSelecionado?.id === usuario.id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                        onClick={() => setUsuarioSelecionado(usuario)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={usuario.avatar_url} />
                            <AvatarFallback className="text-sm">
                              {getIniciais(usuario.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{usuario.nome}</p>
                            <p className="text-sm text-gray-600">{usuario.email || 'Sem email'}</p>
                          </div>
                          {usuarioSelecionado?.id === usuario.id && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Seleção de Função */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Função na Equipe</Label>
            
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(FUNCOES_CONFIG).map(([funcao, config]) => {
                const IconComponent = config.icon;
                const isSelected = funcaoSelecionada === funcao;
                
                return (
                  <div
                    key={funcao}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFuncaoSelecionada(funcao as FuncaoEquipe)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{config.label}</p>
                        <p className="text-xs text-gray-600">{config.description}</p>
                      </div>
                      {isSelected && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data de Entrada */}
          <div className="space-y-2">
            <Label htmlFor="data-entrada" className="text-base font-medium">
              Data de Entrada
            </Label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <Input
                id="data-entrada"
                type="date"
                value={dataEntrada}
                onChange={(e) => setDataEntrada(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Resumo da Seleção */}
          {usuarioSelecionado && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Resumo da Adição</h4>
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={usuarioSelecionado.avatar_url} />
                  <AvatarFallback>
                    {getIniciais(usuarioSelecionado.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{usuarioSelecionado.nome}</p>
                  <p className="text-sm text-gray-600">{usuarioSelecionado.email || 'Sem email'}</p>
                </div>
                <Badge className={FUNCOES_CONFIG[funcaoSelecionada].color}>
                  {FUNCOES_CONFIG[funcaoSelecionada].label}
                </Badge>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAdicionarMembro}
              disabled={!usuarioSelecionado || loading}
              className="min-w-32"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adicionando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Adicionar Membro
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

