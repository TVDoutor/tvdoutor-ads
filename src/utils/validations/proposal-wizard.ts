import { z } from 'zod';
import { getSelectedDurations } from '@/lib/pricing';

// Schemas Zod por etapa do wizard

export const Step1Schema = z.object({
  proposal_type: z.array(z.enum(['avulsa', 'projeto'])).min(1, 'Selecione pelo menos um tipo de proposta'),
});

export const Step2Schema = z.object({
  customer_name: z.string().min(1, 'Nome do cliente é obrigatório'),
  customer_email: z.string().email('Email inválido'),
});

export const Step3Schema = z.object({
  selected_project: z.any(),
}).refine((v) => !!v.selected_project, {
  message: 'Projeto obrigatório',
  path: ['selected_project'],
});

export const Step4Schema = z.object({
  selectedScreens: z.array(z.number()).min(1, 'Selecione pelo menos uma tela'),
});

export const Step5Schema = z.object({
  film_seconds: z.array(z.number()).min(1, 'Informe ao menos uma duração'),
  custom_film_seconds: z.number().optional(),
  insertions_per_hour: z.number().positive('Inserções por hora deve ser > 0'),
  cpm_mode: z.enum(['manual', 'blended', 'valor_insercao']).optional(),
  pricing_mode: z.enum(['cpm', 'insertion']).optional(),
  pricing_variant: z.enum(['avulsa', 'especial']).optional(),
  period_unit: z.enum(['months', 'days']).optional(),
  horas_operacao_dia: z.number().positive('Horas de operação/dia deve ser > 0'),
  dias_uteis_mes_base: z.number().positive('Dias úteis/mês base deve ser > 0'),
  avg_audience_per_insertion: z.number().nonnegative('Audiência média por inserção deve ser >= 0').optional(),
  insertion_prices: z.object({
    // As chaves de objetos em JS são strings; usamos z.string() para garantir compatibilidade
    avulsa: z.record(z.string(), z.number()),
    especial: z.record(z.string(), z.number()),
  }),
  discounts_per_insertion: z
    .object({
      avulsa: z.record(z.string(), z.object({ pct: z.number().optional(), fixed: z.number().optional() })),
      especial: z.record(z.string(), z.object({ pct: z.number().optional(), fixed: z.number().optional() })),
    })
    .optional(),
}).superRefine((val, ctx) => {
  const modeFromCpm = val.cpm_mode === 'valor_insercao' ? 'insertion' : 'cpm';
  const mode = val.pricing_mode ?? modeFromCpm;
  const variant = val.pricing_variant ?? 'avulsa';
  if (mode === 'insertion') {
    const durations = getSelectedDurations(val.film_seconds, val.custom_film_seconds);
    const table = val.insertion_prices?.[variant] || {};
    const missing = durations.filter((sec) => {
      // As chaves foram validadas como strings; coerção numérica -> string para lookup
      const price = table[String(sec)];
      return price === undefined || price === null || isNaN(price) || price <= 0;
    });
    if (missing.length > 0) {
      const list = missing.map((s) => `${s}"`).join(', ');
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['insertion_prices'],
        message: `Preço por inserção obrigatório para: ${list} (variante ${variant}).`,
      });
    }
  }
});

export type StepValidationResult = {
  success: boolean;
  errors?: string[];
};

export function validateWizardStep(step: number, data: any): StepValidationResult {
  let result: ReturnType<z.SafeParseReturnType<any, any>>;
  switch (step) {
    case 1:
      result = Step1Schema.safeParse(data);
      break;
    case 2:
      result = Step2Schema.safeParse(data);
      break;
    case 3:
      result = Step3Schema.safeParse(data);
      break;
    case 4:
      result = Step4Schema.safeParse(data);
      break;
    case 5:
      result = Step5Schema.safeParse(data);
      break;
    default:
      return { success: true };
  }

  if (result.success) return { success: true };
  return { success: false, errors: result.error.errors.map((e) => e.message) };
}
