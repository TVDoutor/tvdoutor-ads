import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, User, Flag } from 'lucide-react';
import { getProjectMilestonesByProject, type ProjectMilestone } from '@/lib/milestone-service';

interface MilestoneListProps {
  projectId: string;
  onMilestoneClick?: (milestone: ProjectMilestone) => void;
}

/**
 * Componente que demonstra como usar a chamada GET para buscar marcos de projeto
 * Este é um exemplo prático de como implementar a nova abordagem
 */
export const MilestoneList: React.FC<MilestoneListProps> = ({ 
  projectId, 
  onMilestoneClick 
}) => {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar marcos usando GET
  const fetchMilestones = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      // ✅ Usar a nova função GET em vez de POST
      const result = await getProjectMilestonesByProject(projectId);
      
      if (result.success) {
        setMilestones(result.data);
      } else {
        setError(result.error || 'Erro ao carregar marcos');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Buscar marcos quando o componente montar ou o projectId mudar
  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  // Função para obter a cor do badge baseada no status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'bg-green-100 text-green-800';
      case 'em_andamento':
        return 'bg-yellow-100 text-yellow-800';
      case 'pendente':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  // Função para formatar data
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não definida';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando marcos...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Buscando marcos do projeto...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Erro ao carregar marcos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchMilestones} variant="outline">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (milestones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Marcos do Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Nenhum marco encontrado para este projeto.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Marcos do Projeto ({milestones.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onMilestoneClick?.(milestone)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {milestone.nome_marco}
                  </h3>
                  
                  {milestone.descricao && (
                    <p className="text-sm text-gray-600 mb-2">
                      {milestone.descricao}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Prazo: {formatDate(milestone.data_prevista)}</span>
                    </div>
                    
                    {milestone.data_conclusao && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Concluído: {formatDate(milestone.data_conclusao)}</span>
                      </div>
                    )}
                    
                    {milestone.responsavel_id && (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>Responsável: {milestone.responsavel_id}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Badge className={getStatusColor(milestone.status)}>
                    {milestone.status}
                  </Badge>
                  
                  {milestone.ordem && (
                    <span className="text-xs text-gray-400">
                      Ordem: {milestone.ordem}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MilestoneList;
