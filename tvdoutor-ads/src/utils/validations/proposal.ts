import { z } from "zod";

// Schema de Screen com normalização de campos opcionais
export const ScreenSchema = z
  .object({
    id: z.coerce.number().optional().nullable(),
    name: z.string().optional().nullable(),
    display_name: z.string().optional().nullable(),
    screen_type: z.string().optional().nullable(),
    formatted_address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    class: z.string().optional().nullable(),
    // Campos adicionais possíveis vindos da API
    category: z.string().optional().nullable(),
    board_format: z.string().optional().nullable(),
    address_norm: z.string().optional().nullable(),
    address_raw: z.string().optional().nullable(),
    google_formatted_address: z.string().optional().nullable(),
  })
  .transform((s) => {
    // Garantir formatted_address e screen_type coerentes
    const formatted_address = s.formatted_address ?? s.google_formatted_address ?? s.address_norm ?? s.address_raw;
    // Derivar screen_type se vier como category ou board_format
    const screen_type = s.screen_type ?? s.category ?? s.board_format;
    return {
      ...s,
      formatted_address,
      screen_type,
    };
  });

export const ProposalScreenSchema = z
  .object({
    id: z.coerce.number().optional().nullable(),
    screen_id: z.coerce.number(),
    custom_cpm: z.coerce.number().optional().nullable(),
    screens: ScreenSchema.nullable().optional(),
  })
  .transform((ps) => ({
    ...ps,
    screens: ps.screens ? ScreenSchema.parse(ps.screens) : null,
  }));

export const ProposalDetailsSchema = z.object({
  id: z.coerce.number().optional().nullable(),
  title: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  customer_name: z.string().optional().nullable(),
  customer_email: z.string().optional().nullable(),
  proposal_type: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  status_updated_at: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  net_calendar: z.coerce.number().optional().nullable(),
  gross_calendar: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  insertions_per_hour: z.coerce.number().optional().nullable(),
  film_seconds: z.coerce.number().optional().nullable(),
  cpm_value: z.coerce.number().optional().nullable(),
  discount_pct: z.coerce.number().optional().nullable(),
  discount_fixed: z.coerce.number().optional().nullable(),
  horas_operacao_dia: z.coerce.number().optional().nullable(),
  dias_uteis_mes_base: z.coerce.number().optional().nullable(),
  period_unit: z.string().optional().nullable(),
  months_period: z.coerce.number().optional().nullable(),
  days_period: z.coerce.number().optional().nullable(),
  quote: z.any().optional().nullable(),
  // campos financeiros
  gross_value: z.coerce.number().optional().nullable(),
  net_value: z.coerce.number().optional().nullable(),
  impressions: z.coerce.number().optional().nullable(),
  investment_total: z.coerce.number().optional().nullable(),
  // screens da proposta
  proposal_screens: z.array(ProposalScreenSchema).optional(),
  // projeto
  agencia_projetos: z.any().optional(),
});

export type ProposalDetailsParsed = z.infer<typeof ProposalDetailsSchema>;

export function normalizeProposal(input: unknown): ProposalDetailsParsed {
  const result = ProposalDetailsSchema.safeParse(input ?? {});
  if (!result.success) {
    // Evitar quebrar a UI — logar e retornar fallback mínimo
    console.warn('[Zod][normalizeProposal] Falha ao parsear ProposalDetails:', result.error?.issues);
    const anyInput = (input || {}) as any;
    return {
      ...anyInput,
      proposal_screens: Array.isArray(anyInput?.proposal_screens) ? anyInput.proposal_screens : [],
    };
  }
  const parsed = result.data;
  let normalizedQuote: any = parsed.quote ?? null;

  if (typeof normalizedQuote === 'string') {
    try {
      normalizedQuote = JSON.parse(normalizedQuote);
    } catch (error) {
      console.warn('[normalizeProposal] Falha ao converter quote string para objeto:', error);
      normalizedQuote = null;
    }
  }

  if (normalizedQuote && typeof normalizedQuote !== 'object') {
    normalizedQuote = null;
  }

  return {
    ...parsed,
    proposal_screens: parsed.proposal_screens ?? [],
    quote: normalizedQuote,
  };
}
