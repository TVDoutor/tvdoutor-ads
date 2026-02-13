import type { SearchParams, ScreenSearchResult } from '@/lib/search-service';
import { geocodeAddress } from '@/lib/geocoding';

type VenueAgg = {
  id: string;
  name: string;
  city: string;
  state: string;
  screens: ScreenSearchResult[];
  screenCount: number;
};

const normalizeCep = (raw: string): string | null => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const unique = <T>(arr: T[]): T[] => Array.from(new Set(arr));

export async function parseCepXls(file: File): Promise<{ ceps: string[]; errors: string[] }>{
  const name = file.name.toLowerCase();
  if (name.endsWith('.xls')) return { ceps: [], errors: ['Formato .xls não suportado. Converta para .xlsx.'] };
  const ceps: string[] = [];
  const errors: string[] = [];
  try {
    const arrayBuffer = await file.arrayBuffer();
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return { ceps: [], errors: ['Planilha vazia'] };
    sheet.eachRow((row, rowNumber) => {
      const raw = String(row.getCell(1).value ?? '').trim();
      if (!raw) return;
      const n = normalizeCep(raw);
      if (!n) {
        errors.push(`Linha ${rowNumber}: CEP inválido`);
        return;
      }
      ceps.push(n);
    });
    return { ceps: unique(ceps), errors };
  } catch (e) {
    return { ceps: [], errors: ['Falha ao ler .xlsx'] };
  }
}

export function parseCepText(content: string): { ceps: string[]; errors: string[] } {
  const text = String(content || '');
  const matches = text.match(/\b\d{5}-?\d{3}\b/g) || [];
  const ceps: string[] = [];
  const errors: string[] = [];
  if (matches.length === 0) {
    errors.push('Nenhum padrão de CEP (XXXXX-XXX ou XXXXXXXX) encontrado');
  }
  matches.forEach((m, idx) => {
    const n = normalizeCep(m);
    if (n) ceps.push(n);
    else errors.push(`Item ${idx + 1} inválido: ${m}`);
  });
  return { ceps: unique(ceps), errors };
}

const pLimit = (concurrency: number) => {
  const queue: (() => Promise<any>)[] = [];
  let active = 0;
  const runNext = () => {
    if (active >= concurrency) return;
    const fn = queue.shift();
    if (!fn) return;
    active++;
    fn().finally(() => {
      active--;
      runNext();
    });
  };
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => fn().then(resolve, reject));
      runNext();
    });
  };
};

const cepCache = new Map<string, { lat: number; lng: number; formatted: string }>();

export async function batchFindScreensByCEPs(ceps: string[], radiusKm: number, durationWeeks: string): Promise<{ screens: ScreenSearchResult[]; venues: VenueAgg[] }>{
  const { searchScreensNearLocation } = await import('@/lib/search-service');
  const limit = pLimit(4);
  const tasks = ceps.map((cep) => limit(async () => {
    let geo = cepCache.get(cep);
    if (!geo) {
      const g = await geocodeAddress(cep);
      geo = { lat: g.lat, lng: g.lng, formatted: g.google_formatted_address };
      cepCache.set(cep, geo);
    }
    const params: SearchParams = {
      lat: geo.lat,
      lng: geo.lng,
      startDate: new Date().toISOString().split('T')[0],
      durationWeeks,
      addressName: cep,
      formattedAddress: geo.formatted,
      radiusKm
    };
    const res = await searchScreensNearLocation(params);
    return res;
  }));
  const results = await Promise.all(tasks);
  const allScreens = results.flat();
  const uniqueById: Record<string, ScreenSearchResult> = {};
  for (const s of allScreens) uniqueById[String(s.id)] = s;
  const screens = Object.values(uniqueById);
  const venuesMap = new Map<string, VenueAgg>();
  for (const s of screens) {
    const key = `${s.display_name || s.name}-${s.city}-${s.state}`;
    if (!venuesMap.has(key)) {
      venuesMap.set(key, {
        id: key,
        name: s.display_name || s.name,
        city: s.city,
        state: s.state,
        screens: [],
        screenCount: 0
      });
    }
    const v = venuesMap.get(key)!;
    v.screens.push(s);
    v.screenCount++;
  }
  const venues = Array.from(venuesMap.values());
  return { screens, venues };
}
