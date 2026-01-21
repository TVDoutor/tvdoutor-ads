/**
 * Hooks para gerenciamento completo de profissionais da saúde
 * 
 * Inclui CRUD de profissionais e vínculo com venues
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabase, type Tables, type TablesInsert, type TablesUpdate } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Tipos das tabelas
export type ProfissionalSaude = Tables<'profissionais_saude'>;
export type ProfissionalVenue = Tables<'profissional_venue'>;
export type ProfissionalEspecialidade = Tables<'profissional_especialidades'>;

// Tipos para formulários
export interface ProfissionalFormData extends TablesInsert<'profissionais_saude'> {}
export interface ProfissionalVenueFormData extends TablesInsert<'profissional_venue'> {}

/**
 * Hook para buscar todos os profissionais
 */
export function useProfissionaisSaude(
  options?: Omit<UseQueryOptions<ProfissionalSaude[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['profissionais-saude'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profissionais_saude')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    ...options
  });
}

/**
 * Hook para buscar um profissional específico por ID
 */
export function useProfissional(profissionalId: string | null) {
  return useQuery({
    queryKey: ['profissional', profissionalId],
    queryFn: async () => {
      if (!profissionalId) return null;

      const { data, error } = await supabase
        .from('profissionais_saude')
        .select('*')
        .eq('id', profissionalId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    },
    enabled: !!profissionalId
  });
}

/**
 * Hook para criar novo profissional
 */
export function useCreateProfissional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProfissionalFormData) => {
      console.log('📝 Tentando criar profissional:', data);
      
      const { data: profissional, error } = await supabase
        .from('profissionais_saude')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao inserir no Supabase:', error);
        throw error;
      }
      
      console.log('✅ Profissional criado com sucesso:', profissional);
      return profissional;
    },
    onSuccess: (data) => {
      console.log('🎉 Sucesso! Profissional salvo:', data);
      queryClient.invalidateQueries({ queryKey: ['profissionais-saude'] });
      queryClient.invalidateQueries({ queryKey: ['corpo-clinico'] });
      toast.success('Profissional cadastrado com sucesso!');
    },
    onError: (error: any) => {
      console.error('❌ Erro completo:', error);
      console.error('❌ Detalhes do erro:', error.details);
      console.error('❌ Hint:', error.hint);
      toast.error(`Erro ao cadastrar profissional: ${error.message}`);
    }
  });
}

/**
 * Hook para atualizar profissional
 */
export function useUpdateProfissional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TablesUpdate<'profissionais_saude'> }) => {
      const { data: profissional, error } = await supabase
        .from('profissionais_saude')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return profissional;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profissionais-saude'] });
      queryClient.invalidateQueries({ queryKey: ['profissional', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['corpo-clinico'] });
      toast.success('Profissional atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar profissional:', error);
      toast.error(`Erro ao atualizar profissional: ${error.message}`);
    }
  });
}

/**
 * Hook para deletar profissional
 */
export function useDeleteProfissional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profissionais_saude')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissionais-saude'] });
      queryClient.invalidateQueries({ queryKey: ['corpo-clinico'] });
      toast.success('Profissional removido com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao deletar profissional:', error);
      toast.error(`Erro ao remover profissional: ${error.message}`);
    }
  });
}

/**
 * Hook para buscar venues de um profissional
 */
export function useProfissionalVenues(profissionalId: string | null) {
  return useQuery({
    queryKey: ['profissional-venues', profissionalId],
    queryFn: async () => {
      if (!profissionalId) return [];

      const { data, error } = await supabase
        .from('profissional_venue')
        .select(`
          *,
          venues (
            id,
            name,
            cidade,
            state
          )
        `)
        .eq('profissional_id', profissionalId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profissionalId
  });
}

/**
 * Hook para vincular profissional a venue
 */
export function useVincularProfissionalVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProfissionalVenueFormData) => {
      console.log('🔗 Tentando vincular profissional:', data);
      
      const { data: vinculo, error } = await supabase
        .from('profissional_venue')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao vincular:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('✅ Vínculo criado com sucesso:', vinculo);
      return vinculo;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profissional-venues', variables.profissional_id] });
      queryClient.invalidateQueries({ queryKey: ['corpo-clinico'] });
      toast.success('Profissional vinculado ao venue com sucesso!');
    },
    onError: (error: any) => {
      console.error('❌ Erro final ao vincular profissional:', error);
      toast.error(`Erro ao vincular profissional: ${error.message}`);
    }
  });
}

/**
 * Hook para remover vínculo profissional-venue
 */
export function useDesvincularProfissionalVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vinculoId: string) => {
      const { error } = await supabase
        .from('profissional_venue')
        .delete()
        .eq('id', vinculoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissional-venues'] });
      queryClient.invalidateQueries({ queryKey: ['corpo-clinico'] });
      toast.success('Vínculo removido com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao remover vínculo:', error);
      toast.error(`Erro ao remover vínculo: ${error.message}`);
    }
  });
}

/**
 * Hook para buscar especialidades disponíveis
 */
export function useEspecialidades() {
  return useQuery({
    queryKey: ['especialidades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specialties')
        .select('*')
        .order('specialty', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10 // Cache de 10 minutos
  });
}

/**
 * Hook para buscar especialidades de um profissional
 */
export function useProfissionalEspecialidades(profissionalId: string | null) {
  return useQuery({
    queryKey: ['profissional-especialidades', profissionalId],
    queryFn: async () => {
      if (!profissionalId) return [];

      const { data, error} = await supabase
        .from('profissional_especialidades')
        .select(`
          *,
          specialties (
            id,
            specialty
          )
        `)
        .eq('profissional_id', profissionalId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profissionalId
  });
}

/**
 * Hook para adicionar especialidade a profissional
 */
export function useAddEspecialidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { profissional_id: string; specialty_id: string }) => {
      const { data: especialidade, error } = await supabase
        .from('profissional_especialidades')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return especialidade;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profissional-especialidades', variables.profissional_id] });
      queryClient.invalidateQueries({ queryKey: ['corpo-clinico'] });
      toast.success('Especialidade adicionada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar especialidade:', error);
      toast.error(`Erro ao adicionar especialidade: ${error.message}`);
    }
  });
}

/**
 * Hook para remover especialidade de profissional
 */
export function useRemoveEspecialidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profissional_id, specialty_id }: { profissional_id: string; specialty_id: string }) => {
      const { error } = await supabase
        .from('profissional_especialidades')
        .delete()
        .eq('profissional_id', profissional_id)
        .eq('specialty_id', specialty_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profissional-especialidades', variables.profissional_id] });
      queryClient.invalidateQueries({ queryKey: ['corpo-clinico'] });
      toast.success('Especialidade removida com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao remover especialidade:', error);
      toast.error(`Erro ao remover especialidade: ${error.message}`);
    }
  });
}
