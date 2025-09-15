/**
 * EXEMPLOS DE COMO ALTERAR CHAMADAS DE POST PARA GET
 * 
 * Este arquivo contém exemplos de como modificar chamadas existentes
 * para usar GET em vez de POST na Edge Function project-milestones
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// EXEMPLO 1: Chamada POST (ANTIGA - NÃO RECOMENDADA)
// ============================================================================

/**
 * ❌ EXEMPLO DE CHAMADA POST (ANTIGA)
 * Esta é a forma antiga que você NÃO deve usar
 */
export async function getMilestonesOldWay_POST(projectId: string) {
  try {
    // ❌ FORMA ANTIGA - POST com dados no body
    const { data, error } = await supabase.functions.invoke('project-milestones', {
      body: {
        projeto_id: projectId,
        agencia_id: null
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar marcos (POST):', error);
    throw error;
  }
}

// ============================================================================
// EXEMPLO 2: Chamada GET (NOVA - RECOMENDADA)
// ============================================================================

/**
 * ✅ EXEMPLO DE CHAMADA GET (NOVA)
 * Esta é a forma nova e recomendada
 */
export async function getMilestonesNewWay_GET(projectId: string) {
  try {
    // ✅ FORMA NOVA - GET com parâmetros na URL
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado');
    }

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
    console.error('Erro ao buscar marcos (GET):', error);
    throw error;
  }
}

// ============================================================================
// EXEMPLO 3: Comparação lado a lado
// ============================================================================

/**
 * COMPARAÇÃO: POST vs GET
 */

// ❌ ANTES (POST):
export async function buscarMarcosProjeto_ANTES(projectId: string) {
  const { data, error } = await supabase.functions.invoke('project-milestones', {
    body: { projeto_id: projectId }  // ❌ Dados no body
  });
  return data;
}

// ✅ DEPOIS (GET):
export async function buscarMarcosProjeto_DEPOIS(projectId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-milestones?projeto_id=${projectId}`, // ✅ Parâmetros na URL
    {
      method: 'GET', // ✅ Método GET
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    }
  );

  const data = await response.json();
  return data;
}

// ============================================================================
// EXEMPLO 4: Como usar em um componente React
// ============================================================================

import { useState, useEffect } from 'react';

/**
 * Exemplo de hook personalizado para buscar marcos
 */
export function useProjectMilestones(projectId: string) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchMilestones = async () => {
      setLoading(true);
      setError(null);

      try {
        // ✅ Usar a nova função GET
        const result = await buscarMarcosProjeto_DEPOIS(projectId);
        
        if (result.success) {
          setMilestones(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMilestones();
  }, [projectId]);

  return { milestones, loading, error };
}

// ============================================================================
// EXEMPLO 5: Múltiplos parâmetros
// ============================================================================

/**
 * Exemplo com múltiplos parâmetros de query
 */
export async function buscarMarcosComFiltros(
  projectId?: string, 
  agencyId?: string, 
  status?: string
) {
  const { data: { session } } = await supabase.auth.getSession();
  
  // Construir query string dinamicamente
  const params = new URLSearchParams();
  if (projectId) params.append('projeto_id', projectId);
  if (agencyId) params.append('agencia_id', agencyId);
  if (status) params.append('status', status);

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-milestones?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    }
  );

  const data = await response.json();
  return data;
}

// ============================================================================
// EXEMPLO 6: Tratamento de erros robusto
// ============================================================================

/**
 * Exemplo com tratamento de erros mais robusto
 */
export async function buscarMarcosComTratamentoErro(projectId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado');
    }

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

    // Verificar se a resposta é ok
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Não autorizado - faça login novamente');
      } else if (response.status === 404) {
        throw new Error('Projeto não encontrado');
      } else if (response.status >= 500) {
        throw new Error('Erro interno do servidor');
      } else {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
    }

    const data = await response.json();
    
    // Verificar se a resposta da Edge Function indica sucesso
    if (!data.success) {
      throw new Error(data.error || 'Erro ao buscar marcos');
    }

    return data;
  } catch (error) {
    console.error('Erro detalhado ao buscar marcos:', error);
    
    // Retornar erro estruturado
    return {
      success: false,
      data: [],
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
