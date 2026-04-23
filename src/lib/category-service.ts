import { supabase } from '@/integrations/supabase/client';

export interface CategoryDefinition {
  id: string;
  label: string;
  aliases: string[];
  specialties: string[];
}

export interface CategorySearchResult {
  id: string;
  label: string;
  matchedBy: string;
  specialtiesCount: number;
  specialties: string[];
}

export interface CategoryScreenResult {
  id: number;
  code: string;
  name: string;
  display_name: string;
  city: string;
  state: string;
  class: string;
  active: boolean;
  specialty: string[];
  category: string | null;
  venue_name?: string | null;
  address?: string | null;
}

const FALLBACK_CATEGORY_CATALOG: CategoryDefinition[] = [
  {
    id: 'odonto',
    label: 'Odonto',
    aliases: ['odonto', 'odontologia', 'odonto pediatria', 'odontopediatria', 'dentista', 'dental'],
    specialties: [
      'ODONTOLOGIA',
      'ODONTOLOGIA CLINICA GERAL',
      'ODONTOLOGIA CLÍNICA GERAL',
      'ODONTOPEDIATRIA',
      'IMPLANTODONTIA',
      'ENDODONTIA',
      'ORTODONTIA',
      'ORTOPEDIA FUNCIONAL DOS MAXILARES',
      'PERIODONTIA',
      'PRÓTESE DENTÁRIA',
      'PROTESE DENTARIA',
      'PRÓTESE',
      'PROTESE',
      'BUCOMAXILO',
      'BUCOMAXILOFACIAL',
      'CIRURGIA E TRAUMATOLOGIA BUCOMAXILOFACIAL',
      'ESTOMATOLOGIA',
      'HARMONIZACAO OROFACIAL',
      'HARMONIZAÇÃO OROFACIAL',
      'DENTÍSTICA',
      'DENTISTICA',
    ],
  },
  {
    id: 'cardio',
    label: 'Cardio',
    aliases: ['cardio', 'cardiologia', 'cardiologista', 'coracao', 'coração'],
    specialties: [
      'CARDIOLOGIA',
      'CARDIOLOGIA CLINICA',
      'CARDIOLOGIA CLÍNICA',
      'HEMODINAMICA',
      'HEMODINÂMICA',
      'ARRITMOLOGIA',
      'ECOCARDIOGRAFIA',
    ],
  },
  {
    id: 'oftalmo',
    label: 'Oftalmo',
    aliases: ['oftalmo', 'oftalmologia', 'oftalmologista', 'visao', 'visão'],
    specialties: [
      'OFTALMOLOGIA',
      'RETINA',
      'GLAUCOMA',
      'CATARATA',
      'PLASTICA OCULAR',
      'PLÁSTICA OCULAR',
      'ESTRABISMO',
    ],
  },
  {
    id: 'dermato',
    label: 'Dermato',
    aliases: ['dermato', 'dermatologia', 'pele', 'dermatologista'],
    specialties: [
      'DERMATOLOGIA',
      'DERMATOLOGIA CLINICA',
      'DERMATOLOGIA CLÍNICA',
      'COSMIATRIA',
      'TRICOLOGIA',
    ],
  },
  {
    id: 'gineco',
    label: 'Gineco',
    aliases: ['gineco', 'ginecologia', 'ginecologista', 'mulher', 'saude da mulher', 'saúde da mulher'],
    specialties: [
      'GINECOLOGIA',
      'OBSTETRICIA',
      'OBSTETRÍCIA',
      'GINECOLOGIA E OBSTETRICIA',
      'GINECOLOGIA E OBSTETRÍCIA',
      'MASTOLOGIA',
    ],
  },
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueNormalized(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(value);
  }

  return result;
}

function sanitizeCatalog(categories: CategoryDefinition[]) {
  return categories.map((category) => ({
    ...category,
    aliases: uniqueNormalized(category.aliases),
    specialties: uniqueNormalized(category.specialties),
  }));
}

function getFallbackCatalog() {
  return sanitizeCatalog(FALLBACK_CATEGORY_CATALOG);
}

function matchesCategory(query: string, category: CategoryDefinition) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return false;

  const haystacks = [category.label, ...category.aliases].map(normalizeText);
  return haystacks.some((value) => value.includes(normalizedQuery));
}

function matchReason(query: string, category: CategoryDefinition) {
  const normalizedQuery = normalizeText(query);
  const label = normalizeText(category.label);
  if (label.includes(normalizedQuery)) return category.label;

  const alias = category.aliases.find((item) => normalizeText(item).includes(normalizedQuery));
  return alias ?? category.label;
}

function specialtyMatchesCategory(specialty: string, category: CategoryDefinition) {
  const normalizedSpecialty = normalizeText(specialty);
  if (!normalizedSpecialty) return false;

  return category.specialties.some((item) => {
    const normalizedCategorySpecialty = normalizeText(item);
    return (
      normalizedSpecialty === normalizedCategorySpecialty ||
      normalizedSpecialty.includes(normalizedCategorySpecialty) ||
      normalizedCategorySpecialty.includes(normalizedSpecialty)
    );
  });
}

type CategoryCatalogRpcRow = {
  id: string;
  label: string;
  aliases: string[] | null;
  specialties: string[] | null;
  sort_order?: number | null;
};

type CategorySearchRpcRow = {
  id: string;
  label: string;
  matched_by: string | null;
  specialties_count: number | null;
  specialties: string[] | null;
};

let categoryCatalogCache: CategoryDefinition[] = getFallbackCatalog();
let categoryCatalogLoadPromise: Promise<CategoryDefinition[]> | null = null;

function upsertCategoryInCache(nextCategory: CategoryDefinition) {
  const normalized = sanitizeCatalog([nextCategory])[0];
  const existingIndex = categoryCatalogCache.findIndex((category) => category.id === normalized.id);
  if (existingIndex >= 0) {
    categoryCatalogCache[existingIndex] = normalized;
    return;
  }
  categoryCatalogCache = [...categoryCatalogCache, normalized];
}

async function loadCatalogFromDatabase(): Promise<CategoryDefinition[]> {
  const { data, error } = await supabase.rpc('get_category_catalog');
  if (error) {
    throw new Error(`Erro ao carregar catálogo de categorias: ${error.message}`);
  }

  const mapped = ((data ?? []) as CategoryCatalogRpcRow[]).map((row) => ({
    id: String(row.id),
    label: String(row.label ?? row.id),
    aliases: Array.isArray(row.aliases) ? row.aliases.filter((value): value is string => typeof value === 'string') : [],
    specialties: Array.isArray(row.specialties) ? row.specialties.filter((value): value is string => typeof value === 'string') : [],
  }));

  categoryCatalogCache = sanitizeCatalog(mapped);
  return categoryCatalogCache;
}

export class CategoryService {
  static getCatalog(): CategoryDefinition[] {
    return categoryCatalogCache;
  }

  static async ensureCatalogLoaded(): Promise<void> {
    if (!categoryCatalogLoadPromise) {
      categoryCatalogLoadPromise = loadCatalogFromDatabase()
        .catch((error) => {
          console.warn('[CategoryService] fallback para catálogo local:', error);
          return categoryCatalogCache;
        })
        .finally(() => {
          categoryCatalogLoadPromise = null;
        });
    }

    await categoryCatalogLoadPromise;
  }

  static async searchCategories(query: string): Promise<CategorySearchResult[]> {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];

    try {
      const { data, error } = await supabase.rpc('search_categories', { q: query });
      if (error) {
        throw new Error(error.message);
      }

      const results = ((data ?? []) as CategorySearchRpcRow[]).map((row) => {
        const specialties = Array.isArray(row.specialties)
          ? row.specialties.filter((value): value is string => typeof value === 'string')
          : [];

        upsertCategoryInCache({
          id: String(row.id),
          label: String(row.label ?? row.id),
          aliases: [],
          specialties,
        });

        return {
          id: String(row.id),
          label: String(row.label ?? row.id),
          matchedBy: String(row.matched_by ?? row.label ?? row.id),
          specialtiesCount: Number(row.specialties_count ?? specialties.length),
          specialties,
        };
      });

      if (results.length > 0) {
        return results;
      }
    } catch (error) {
      console.warn('[CategoryService] search_categories RPC indisponível, usando fallback local.', error);
    }

    return this.getCatalog()
      .filter((category) => matchesCategory(normalizedQuery, category))
      .map((category) => ({
        id: category.id,
        label: category.label,
        matchedBy: matchReason(normalizedQuery, category),
        specialtiesCount: category.specialties.length,
        specialties: category.specialties,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }

  static getCategoryById(categoryId: string): CategoryDefinition | null {
    return this.getCatalog().find((category) => category.id === categoryId) ?? null;
  }

  static getCategoriesByIds(categoryIds: string[]): CategoryDefinition[] {
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) return [];
    const requested = new Set(categoryIds);
    return this.getCatalog().filter((category) => requested.has(category.id));
  }

  static async getScreensByCategory(categoryId: string, specialtiesOverride?: string[]): Promise<CategoryScreenResult[]> {
    const autoCategorySpecialty = categoryId.startsWith('auto:') ? categoryId.slice(5).trim() : '';
    const category = this.getCategoryById(categoryId) ?? (
      autoCategorySpecialty
        ? {
            id: categoryId,
            label: autoCategorySpecialty,
            aliases: [],
            specialties: [autoCategorySpecialty],
          }
        : null
    );

    if (!category) {
      throw new Error('Categoria não encontrada.');
    }

    const allowedSpecialties = Array.isArray(specialtiesOverride) && specialtiesOverride.length > 0
      ? uniqueNormalized(specialtiesOverride)
      : category.specialties;

    let query = supabase
      .from('v_screens_enriched')
      .select('id, code, name, display_name, city, state, class, active, specialty, category, venue_name, address')
      .eq('active', true as any);

    if (allowedSpecialties.length > 0) {
      query = query.overlaps('specialty', allowedSpecialties);
    }

    const { data, error } = await query.order('display_name');
    if (error) {
      throw new Error(`Erro ao buscar telas da categoria: ${error.message}`);
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;

    return rows
      .filter((row) => {
        const rowSpecialties = Array.isArray(row.specialty)
          ? row.specialty.filter((value): value is string => typeof value === 'string')
          : [];

        if (rowSpecialties.some((specialty) => {
          const normalizedSpecialty = normalizeText(specialty);
          return (Array.isArray(specialtiesOverride) && specialtiesOverride.length > 0)
            ? allowedSpecialties.some((allowed) => {
                const normalizedAllowed = normalizeText(allowed);
                return (
                  normalizedSpecialty === normalizedAllowed ||
                  normalizedSpecialty.includes(normalizedAllowed) ||
                  normalizedAllowed.includes(normalizedSpecialty)
                );
              })
            : specialtyMatchesCategory(specialty, category);
        })) {
          return true;
        }

        const categoryValue = typeof row.category === 'string' ? row.category : '';
        return normalizeText(categoryValue).includes(normalizeText(category.label));
      })
      .map((row) => ({
        id: Number(row.id),
        code: String(row.code ?? ''),
        name: String(row.name ?? ''),
        display_name: String(row.display_name ?? row.name ?? ''),
        city: String(row.city ?? ''),
        state: String(row.state ?? ''),
        class: String(row.class ?? 'ND'),
        active: Boolean(row.active),
        specialty: Array.isArray(row.specialty)
          ? row.specialty.filter((value): value is string => typeof value === 'string')
          : [],
        category: typeof row.category === 'string' ? row.category : null,
        venue_name: typeof row.venue_name === 'string' ? row.venue_name : null,
        address: typeof row.address === 'string' ? row.address : null,
      }));
  }
}
