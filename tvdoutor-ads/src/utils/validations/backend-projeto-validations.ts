import { z } from 'zod';
import type { ZodIssue } from 'zod';

// Extrair o schema base do projetoSchema original (sem o refine)
const baseProjetoSchema = z.object({
  nome_projeto: z.string().min(3).max(100).trim(),
  descricao: z.string().max(1000).optional().nullable(),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
  deal_id: z.string().uuid(),
  status_projeto: z.enum(['planejamento', 'em_andamento', 'pausado', 'concluido', 'cancelado']).default('planejamento'),
  orcamento_projeto: z.union([z.string(), z.number(), z.null()]).optional().nullable(),
  responsavel_projeto: z.string().uuid().optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'critica']).default('media'),
  tipo_projeto: z.enum(['campanha', 'desenvolvimento', 'manutencao', 'consultoria', 'treinamento']).default('campanha')
});

// Schema mais rigoroso para validações do backend
export const backendProjetoSchema = baseProjetoSchema.extend({
  nome_projeto: z.string()
    .min(3, 'Nome do projeto deve ter pelo menos 3 caracteres')
    .max(100, 'Nome do projeto deve ter no máximo 100 caracteres')
    .trim()
    .refine((val) => {
      return /^[a-zA-Z0-9\s\-_.,!?()]+$/.test(val);
    }, 'Nome do projeto contém caracteres inválidos'),
  
  deal_id: z.string().uuid('Deal ID deve ser um UUID válido'),
  
  // Transformar orçamento para number quando possível
  orcamento_projeto: z.union([
    z.string().transform((val) => {
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    }),
    z.number(),
    z.null()
  ]).optional().nullable().refine((val) => {
    if (val === null || val === undefined) return true;
    return typeof val === 'number' && val >= 0;
  }, 'Orçamento deve ser um valor positivo')
}).refine((data) => {
  if (data.data_inicio && data.data_fim) {
    const inicio = new Date(data.data_inicio);
    const fim = new Date(data.data_fim);
    return fim >= inicio;
  }
  return true;
}, {
  message: 'Data de fim deve ser posterior à data de início',
  path: ['data_fim']
});

// Schema para validação de datas relacionadas
export const projetoDateValidationSchema = z.object({
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable()
}).refine((data) => {
  if (!data.data_inicio || !data.data_fim) return true;
  
  const inicio = new Date(data.data_inicio);
  const fim = new Date(data.data_fim);
  
  return inicio <= fim;
}, {
  message: 'Data de fim deve ser posterior à data de início',
  path: ['data_fim']
});

// Tipos para melhor type safety
type ValidationResult<T> = {
  success: boolean;
  data: T | null;
  errors: Record<string, string> | null;
};

type ErrorAccumulator = Record<string, string>;

// Função para validação completa do backend
export const validateBackendProjeto = async (data: unknown): Promise<ValidationResult<z.infer<typeof backendProjetoSchema>>> => {
  try {
    // Primeiro, validar o schema básico
    const basicValidation = backendProjetoSchema.safeParse(data);
    
    if (!basicValidation.success) {
      return {
        success: false,
        data: null,
        errors: basicValidation.error?.issues?.reduce((acc: ErrorAccumulator, err: ZodIssue) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        }, {} as ErrorAccumulator) || {}
      };
    }
    
    // Validar datas relacionadas
    const dateValidation = projetoDateValidationSchema.safeParse(data);
    
    if (!dateValidation.success) {
      return {
        success: false,
        data: null,
        errors: dateValidation.error.errors.reduce((acc: ErrorAccumulator, err: ZodIssue) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        }, {} as ErrorAccumulator)
      };
    }
    
    return {
      success: true,
      data: basicValidation.data,
      errors: null
    };
    
  } catch (error) {
    return {
      success: false,
      data: null,
      errors: { general: 'Erro de validação do servidor' }
    };
  }
};

// Função para sanitização rigorosa do backend
export const sanitizeBackendProjeto = (data: unknown): Partial<z.infer<typeof backendProjetoSchema>> => {
  if (!data || typeof data !== 'object') {
    return {};
  }
  
  const sanitized = { ...data as Record<string, unknown> };
  
  // Sanitizar strings
  if (typeof sanitized.nome_projeto === 'string') {
    sanitized.nome_projeto = sanitized.nome_projeto.trim().replace(/\s+/g, ' ');
  }
  
  if (typeof sanitized.descricao === 'string') {
    sanitized.descricao = sanitized.descricao.trim().replace(/\s+/g, ' ');
  }
  
  if (typeof sanitized.observacoes === 'string') {
    sanitized.observacoes = sanitized.observacoes.trim().replace(/\s+/g, ' ');
  }
  
  // Sanitizar valores numéricos
  if (sanitized.orcamento_projeto !== null && sanitized.orcamento_projeto !== undefined) {
    const num = parseFloat(String(sanitized.orcamento_projeto));
    sanitized.orcamento_projeto = isNaN(num) ? null : Math.round(num * 100) / 100;
  }
  
  // Sanitizar UUIDs
  if (typeof sanitized.deal_id === 'string') {
    sanitized.deal_id = sanitized.deal_id.trim().toLowerCase();
  }
  
  if (typeof sanitized.responsavel_projeto === 'string') {
    sanitized.responsavel_projeto = sanitized.responsavel_projeto.trim().toLowerCase();
  }
  
  // Sanitizar datas
  if (typeof sanitized.data_inicio === 'string') {
    sanitized.data_inicio = sanitized.data_inicio.trim();
  }
  
  if (typeof sanitized.data_fim === 'string') {
    sanitized.data_fim = sanitized.data_fim.trim();
  }
  
  return sanitized as Partial<z.infer<typeof backendProjetoSchema>>;
};

// Schemas específicos para operações CRUD
const createRequiredFields = ['nome_projeto', 'deal_id'] as const;
const createProjetoSchema = baseProjetoSchema.required(
  Object.fromEntries(createRequiredFields.map(field => [field, true])) as Record<typeof createRequiredFields[number], true>
);

// Validações específicas para operações CRUD
export const validateProjetoForCreate = (data: unknown) => {
  return createProjetoSchema.safeParse(data);
};

export const validateProjetoForUpdate = (data: unknown) => {
  // Para atualização, todos os campos são opcionais
  const updateSchema = baseProjetoSchema.partial();
  return updateSchema.safeParse(data);
};

// Rate limiting e validações de segurança
export const securityValidations = {
  // Verificar se o usuário tem permissão para acessar o projeto
  checkProjectAccess: async (userId: string, projectId: string): Promise<boolean> => {
    // TODO: Implementar verificação de acesso
    // Verificar se o usuário é o criador, responsável ou tem permissões administrativas
    console.warn('checkProjectAccess não implementado:', { userId, projectId });
    return true; // Placeholder
  },
  
  // Verificar rate limiting para operações
  checkRateLimit: async (userId: string, operation: string): Promise<boolean> => {
    // TODO: Implementar rate limiting
    // Limitar número de operações por usuário por período
    console.warn('checkRateLimit não implementado:', { userId, operation });
    return true; // Placeholder
  },
  
  // Validar integridade dos dados
  validateDataIntegrity: async (data: unknown): Promise<boolean> => {
    // TODO: Verificar se os IDs referenciados existem
    // Verificar consistência dos dados
    console.warn('validateDataIntegrity não implementado:', data);
    return true; // Placeholder
  }
};

// Exportar tipos para uso em outros arquivos
export type BackendProjetoData = z.infer<typeof backendProjetoSchema>;
export type CreateProjetoData = z.infer<typeof createProjetoSchema>;
export type UpdateProjetoData = Partial<BackendProjetoData>;