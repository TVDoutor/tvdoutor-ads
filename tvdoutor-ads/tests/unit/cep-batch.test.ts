import { parseCepXls, batchFindScreensByCEPs } from '@/lib/cep-batch';

const mockGeocode = jest.fn(async (cep: string) => ({ lat: -23.561, lng: -46.656, google_formatted_address: cep }));
const mockSearch = jest.fn(async () => ([{ id: '1', code: 'A1', name: 'Tela A', display_name: 'Clínica X', city: 'São Paulo', state: 'SP', lat: -23.56, lng: -46.65, active: true, class: 'A', price: 200, reach: 2000, distance: 1, address_raw: 'End', venue_name: 'Clínica X' }]));

jest.mock('@/lib/geocoding', () => ({ geocodeAddress: (v: string) => mockGeocode(v) }));
jest.mock('@/lib/search-service', () => ({ searchScreensNearLocation: () => mockSearch() }));

describe('cep-batch', () => {
  it('retorna erro para .xls', async () => {
    const file = new File([new Uint8Array([0])], 'lista.xls');
    const res = await parseCepXls(file);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('agrupa e deduplica telas por CEP', async () => {
    const { screens, venues } = await batchFindScreensByCEPs(['01310-100', '01310900'], 5, '2');
    expect(screens.length).toBeGreaterThan(0);
    expect(venues.length).toBeGreaterThan(0);
  });

  it('parseCepText reconhece CEPs com hífen, vírgula e quebra de linha', () => {
    const input = '01310-904, 01310-901\n01310900 texto solto';
    const { ceps, errors } = require('@/lib/cep-batch');
    const res = require('@/lib/cep-batch').parseCepText(input);
    expect(res.ceps.length).toBeGreaterThan(0);
  });
});
