import { supabase } from '@/integrations/supabase/client';

export interface ImpactModel {
  id: number;
  name: string;
  description: string;
  traffic_level: string;
  multiplier: number;
  examples: string[];
  color_scheme: {
    gradient: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
  };
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateImpactModelData {
  name: string;
  description: string;
  traffic_level: string;
  multiplier: number;
  examples: string[];
  color_scheme: {
    gradient: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
  };
}

export interface UpdateImpactModelData extends Partial<CreateImpactModelData> {
  active?: boolean;
}

export class ImpactModelsService {
  /**
   * Busca todas as fórmulas de impacto ativas
   */
  static async getActiveModels(): Promise<ImpactModel[]> {
    try {
      const { data, error } = await supabase
        .from('impact_models')
        .select('*')
        .eq('active', true)
        .order('multiplier', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar fórmulas de impacto:', err);
      throw err;
    }
  }

  /**
   * Busca todas as fórmulas de impacto (incluindo inativas) - apenas para admins
   */
  static async getAllModels(): Promise<ImpactModel[]> {
    try {
      const { data, error } = await supabase
        .from('impact_models')
        .select('*')
        .order('multiplier', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar todas as fórmulas:', err);
      throw err;
    }
  }

  /**
   * Busca uma fórmula específica por ID
   */
  static async getModelById(id: number): Promise<ImpactModel | null> {
    try {
      const { data, error } = await supabase
        .from('impact_models')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erro ao buscar fórmula por ID:', err);
      throw err;
    }
  }

  /**
   * Cria uma nova fórmula de impacto
   */
  static async createModel(modelData: CreateImpactModelData): Promise<ImpactModel> {
    try {
      const { data, error } = await supabase
        .from('impact_models')
        .insert([modelData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erro ao criar fórmula:', err);
      throw err;
    }
  }

  /**
   * Atualiza uma fórmula existente
   */
  static async updateModel(id: number, modelData: UpdateImpactModelData): Promise<ImpactModel> {
    try {
      const { data, error } = await supabase
        .from('impact_models')
        .update(modelData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erro ao atualizar fórmula:', err);
      throw err;
    }
  }

  /**
   * Desativa uma fórmula (soft delete)
   */
  static async deactivateModel(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('impact_models')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao desativar fórmula:', err);
      throw err;
    }
  }

  /**
   * Reativa uma fórmula
   */
  static async activateModel(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('impact_models')
        .update({ active: true })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao reativar fórmula:', err);
      throw err;
    }
  }

  /**
   * Exclui permanentemente uma fórmula
   */
  static async deleteModel(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('impact_models')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao excluir fórmula:', err);
      throw err;
    }
  }

  /**
   * Valida se uma fórmula pode ser excluída (não está sendo usada em propostas)
   */
  static async canDeleteModel(id: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('id')
        .eq('impact_formula', id.toString())
        .limit(1);

      if (error) throw error;
      return !data || data.length === 0;
    } catch (err) {
      console.error('Erro ao verificar uso da fórmula:', err);
      return false;
    }
  }

  /**
   * Obtém estatísticas de uso das fórmulas
   */
  static async getUsageStats(): Promise<{ formula_id: number; formula_name: string; usage_count: number }[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_impact_model_usage_stats');

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar estatísticas de uso:', err);
      // Fallback: buscar dados manualmente
      const { data, error } = await supabase
        .from('proposals')
        .select('impact_formula')
        .not('impact_formula', 'is', null);

      if (error) throw error;
      
      const usageMap = new Map<string, number>();
      data?.forEach(proposal => {
        const formula = proposal.impact_formula;
        usageMap.set(formula, (usageMap.get(formula) || 0) + 1);
      });

      return Array.from(usageMap.entries()).map(([formula_id, usage_count]) => ({
        formula_id: parseInt(formula_id),
        formula_name: `Fórmula ${formula_id}`,
        usage_count
      }));
    }
  }
}
