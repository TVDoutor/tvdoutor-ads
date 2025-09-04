import { z } from 'zod';

// Schema de validação para projetos
export const projetoSchema = z.object({
  nome_projeto: z
    .string()
    .min(3, 'Nome do projeto deve ter pelo menos 3 caracteres')
    .max(100, 'Nome do projeto deve ter no máximo 100 caracteres')
    .trim(),
  
  descricao: z
    .string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional()
    .nullable(),
  
  data_inicio: z
    .string()
    .optional()
    .nullable()
    .refine((date) => {
      if (!date) return true;
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime());
    }, 'Data de início inválida'),
  
  data_fim: z
    .string()
    .optional()
    .nullable()
    .refine((date) => {
      if (!date) return true;
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime());
    }, 'Data de fim inválida'),
  
  deal_id: z
    .string()
    .uuid('Deal ID deve ser um UUID válido'),
  
  status_projeto: z
    .enum(['planejamento', 'em_andamento', 'pausado', 'concluido', 'cancelado'])
    .default('planejamento'),
  
  orcamento_projeto: z
    .union([
      z.string().transform((val) => {
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      }),
      z.number(),
      z.null()
    ])
    .refine((val) => {
      if (val === null || val === undefined) return true;
      return val >= 0;
    }, 'Orçamento deve ser um valor positivo')
    .optional()
    .nullable(),
  
  responsavel_projeto: z
    .string()
    .uuid('ID do responsável deve ser um UUID válido')
    .optional()
    .nullable(),
  
  observacoes: z
    .string()
    .max(2000, 'Observações devem ter no máximo 2000 caracteres')
    .optional()
    .nullable(),
  
  prioridade: z
    .enum(['baixa', 'media', 'alta', 'critica'])
    .default('media'),
  
  tipo_projeto: z
    .enum(['campanha', 'desenvolvimento', 'manutencao', 'consultoria', 'treinamento'])
    .default('campanha')
}).refine((data) => {
  // Validação customizada: data_fim deve ser posterior à data_inicio
  if (data.data_inicio && data.data_fim) {
    const inicio = new Date(data.data_inicio);
    const fim = new Date(data.data_fim);
    return fim >= inicio;
  }
  return true;
}, {
  message: 'Data de fim deve ser posterior ou igual à data de início',
  path: ['data_fim']
});

export type ProjetoFormData = z.infer<typeof projetoSchema>;

// Função para validar dados do projeto
export const validateProjeto = (data: any) => {
  try {
    return {
      success: true,
      data: projetoSchema.parse(data),
      errors: null
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.reduce((acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        }, {} as Record<string, string>)
      };
    }
    return {
      success: false,
      data: null,
      errors: { general: 'Erro de validação desconhecido' }
    };
  }
};

// Validações específicas para campos individuais
export const fieldValidations = {
  nome_projeto: (value: string) => {
    if (!value || value.trim().length < 3) {
      return 'Nome do projeto deve ter pelo menos 3 caracteres';
    }
    if (value.length > 100) {
      return 'Nome do projeto deve ter no máximo 100 caracteres';
    }
    return null;
  },
  
  orcamento_projeto: (value: string | number) => {
    if (value === '' || value === null || value === undefined) {
      return null; // Campo opcional
    }
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) {
      return 'Orçamento deve ser um número válido';
    }
    if (num < 0) {
      return 'Orçamento deve ser um valor positivo';
    }
    return null;
  },
  
  data_range: (data_inicio: string, data_fim: string) => {
    if (!data_inicio || !data_fim) {
      return null; // Se uma das datas não estiver preenchida, não validar
    }
    const inicio = new Date(data_inicio);
    const fim = new Date(data_fim);
    
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      return 'Datas devem ser válidas';
    }
    
    if (fim < inicio) {
      return 'Data de fim deve ser posterior ou igual à data de início';
    }
    
    return null;
  }
};

// Função para sanitizar dados de entrada
export const sanitizeProjeto = (data: any): Partial<ProjetoFormData> => {
  return {
    nome_projeto: data.nome_projeto?.toString().trim() || '',
    descricao: data.descricao?.toString().trim() || '',
    data_inicio: data.data_inicio || '',
    data_fim: data.data_fim || '',
    deal_id: data.deal_id || '',
    status_projeto: data.status_projeto || 'planejamento',
    orcamento_projeto: data.orcamento_projeto ? data.orcamento_projeto.toString() : '',
    responsavel_projeto: data.responsavel_projeto?.toString().trim() || '',
    observacoes: data.observacoes?.toString().trim() || '',
    prioridade: data.prioridade || 'media',
    tipo_projeto: data.tipo_projeto || 'campanha'
  };
};