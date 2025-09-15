import { supabase } from '@/integrations/supabase/client';

/**
 * Serviço para gerenciar marcos de projeto usando a Edge Function project-milestones
 * Exemplo de como fazer chamadas GET para a Edge Function
 */

export interface ProjectMilestone {
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

export interface MilestoneResponse {
  success: boolean;
  data: ProjectMilestone[];
  error?: string;
  details?: string;
}

/**
 * Buscar marcos de projeto por ID do projeto usando GET
 * @param projectId - ID do projeto
 * @returns Promise com os marcos do projeto
 */
export async function getProjectMilestonesByProject(projectId: string): Promise<MilestoneResponse> {
  try {
    // Obter o token de autenticação
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado');
    }

    // Fazer a chamada GET para a Edge Function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-milestones?projeto_id=${projectId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar marcos do projeto:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}





/**
 * Exemplo de como usar o serviço em um componente React
 */
export const useProjectMilestones = () => {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMilestonesByProject = async (projectId: string) => {
    setLoading(true);
    setError(null);
    
    try {
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



  return {
    milestones,
    loading,
    error,
    fetchMilestonesByProject
  };
};


