import { strict as assert } from 'assert';
import {
  getSelectedDurations,
  computeTotalInsertions,
  computeImpacts,
  computeInsertionModeValue,
  computeCPMModeValue,
  calculateProposalMetrics,
} from '../../src/lib/pricing.ts';

function currencyClose(a: number, b: number, tolerance = 1e-6) {
  assert.ok(Math.abs(a - b) <= tolerance, `Expected ${a} ≈ ${b}`);
}

// getSelectedDurations
(() => {
  const list = getSelectedDurations([15, 30, 15], 45);
  assert.deepEqual(list, [15, 30, 45]);
})();

// computeTotalInsertions - days
(() => {
  const total = computeTotalInsertions({
    screens_count: 10,
    film_seconds: [15],
    insertions_per_hour: 6,
    period_unit: 'days',
    days_period: 5,
    insertion_prices: { avulsa: {}, especial: {} },
  } as any);
  assert.equal(total, 6 * 5 * 10);
})();

// computeTotalInsertions - months
(() => {
  const total = computeTotalInsertions({
    screens_count: 5,
    film_seconds: [15],
    insertions_per_hour: 4,
    period_unit: 'months',
    months_period: 2,
    hours_per_day: 10,
    business_days_per_month: 22,
    insertion_prices: { avulsa: {}, especial: {} },
  } as any);
  assert.equal(total, 4 * 10 * 22 * 2 * 5);
})();

// computeImpacts
(() => {
  const total = 1000;
  const impacts = computeImpacts(total, 100);
  assert.equal(impacts, 1000 * 100);
})();

// computeInsertionModeValue com desconto
(() => {
  const input = {
    screens_count: 2,
    film_seconds: [15, 30],
    insertions_per_hour: 5,
    period_unit: 'days',
    days_period: 1,
    pricing_mode: 'insertion',
    pricing_variant: 'avulsa',
    insertion_prices: { avulsa: { 15: 1.0, 30: 2.0 }, especial: {} },
    discounts_per_insertion: { avulsa: { 15: { pct: 10 }, 30: { fixed: 0.5 } }, especial: {} },
  } as any;
  const totalInsertions = computeTotalInsertions(input);
  const { gross, net, missingPriceFor } = computeInsertionModeValue(input, totalInsertions);
  assert.equal(missingPriceFor.length, 0);
  // Preço efetivo: 15s -> 0.9; 30s -> 1.5
  const expectedUnitSum = 0.9 + 1.5; // por inserção
  const expectedTotal = expectedUnitSum * totalInsertions;
  currencyClose(gross, expectedTotal);
  currencyClose(net, expectedTotal);
})();

// computeInsertionModeValue com preço faltante
(() => {
  const input = {
    screens_count: 1,
    film_seconds: [15, 60],
    insertions_per_hour: 2,
    period_unit: 'days',
    days_period: 1,
    pricing_mode: 'insertion',
    pricing_variant: 'avulsa',
    insertion_prices: { avulsa: { 15: 1.0 }, especial: {} },
  } as any;
  const totalInsertions = computeTotalInsertions(input);
  const { gross, missingPriceFor } = computeInsertionModeValue(input, totalInsertions);
  assert.ok(gross > 0);
  assert.deepEqual(missingPriceFor, [60]);
})();

// computeInsertionModeValue com variante 'ambos'
(() => {
  const input = {
    screens_count: 3,
    film_seconds: [15, 30],
    insertions_per_hour: 4,
    period_unit: 'days',
    days_period: 2,
    pricing_mode: 'insertion',
    pricing_variant: 'ambos',
    insertion_prices: { avulsa: { 15: 1.0, 30: 2.0 }, especial: { 15: 0.5, 30: 1.0 } },
    discounts_per_insertion: { avulsa: { 15: { pct: 10 }, 30: { fixed: 0.5 } }, especial: { 15: { fixed: 0.2 } } },
  } as any;
  const totalInsertions = computeTotalInsertions(input);
  const { gross, net, missingPriceFor } = computeInsertionModeValue(input, totalInsertions);
  assert.equal(missingPriceFor.length, 0);
  // Avulsa efetivo: 15s -> 0.9; 30s -> 1.5 | Especial efetivo: 15s -> 0.3; 30s -> 1.0
  const expectedUnitSum = (0.9 + 1.5) + (0.3 + 1.0);
  const expectedTotal = expectedUnitSum * totalInsertions;
  currencyClose(gross, expectedTotal);
  currencyClose(net, expectedTotal);
})();

// computeInsertionModeValue 'ambos' com preços faltantes em uma variante
(() => {
  const input = {
    screens_count: 1,
    film_seconds: [15, 60],
    insertions_per_hour: 2,
    period_unit: 'days',
    days_period: 1,
    pricing_mode: 'insertion',
    pricing_variant: 'ambos',
    insertion_prices: { avulsa: { 15: 1.0 }, especial: { 60: 2.0 } },
  } as any;
  const totalInsertions = computeTotalInsertions(input);
  const { gross, missingPriceFor } = computeInsertionModeValue(input, totalInsertions);
  assert.ok(gross > 0);
  // 15 faltando em especial, 60 faltando em avulsa -> ambos devem aparecer
  assert.deepEqual(missingPriceFor.sort((a,b)=>a-b), [15, 60]);
})();

// computeCPMModeValue
(() => {
  const { gross, net } = computeCPMModeValue(100000, 25, 10, 1000);
  // gross = 100000/1000 * 25 = 2500; net = 2500 - 10% - 1000 = 1250
  currencyClose(gross, 2500);
  currencyClose(net, 1250);
})();

// calculateProposalMetrics integrando tudo
(() => {
  const metrics = calculateProposalMetrics({
    screens_count: 10,
    film_seconds: [15],
    insertions_per_hour: 6,
    period_unit: 'days',
    days_period: 5,
    pricing_mode: 'insertion',
    pricing_variant: 'avulsa',
    insertion_prices: { avulsa: { 15: 1.0 }, especial: {} },
  });
  assert.equal(metrics.totalInsertions, 6 * 5 * 10);
  assert.equal(metrics.missingPriceFor.length, 0);
  assert.ok(metrics.grossValue > 0);
})();

console.log('✅ Testes unitários de pricing.ts executados com sucesso');
