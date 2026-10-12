import { describe, expect, it } from 'vitest';
import { SITE } from '../data/site';
import { sizes } from '../data/menu';
import { SHOW_DEPOSIT, SHOW_SIZE_PRICES, SIZE_INCLUDED, hiddenSize, isSizeLine, lineAmount } from './display';
import { quote } from './pricing';

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

describe('what customers are shown about money', () => {
  it('hides the deposit and the per-size prices by default, and the switches are plain booleans', () => {
    expect(SITE.display).toEqual({ deposit: false, sizePrices: false });
    expect(SHOW_DEPOSIT).toBe(false);
    expect(SHOW_SIZE_PRICES).toBe(false);
  });

  it('recognises the size charge line in a real quote and shows it as included in the total', () => {
    const q = quote({ packageId: 'deluxe', sizeId: 'standard', extraIds: ['pet-hair'] });
    const size = q.lines.find(isSizeLine)!;
    expect(size.label).toBe(sizes.find((s) => s.id === 'standard')!.name);
    expect(lineAmount(size, money)).toBe(SIZE_INCLUDED);
    expect(hiddenSize(size)).toBe(true);
    // every other line keeps its price
    expect(q.lines.filter((l) => !isSizeLine(l)).map((l) => lineAmount(l, money))).toEqual(['$75.00', '$75.00']);
  });

  it('shows the real size price once the switch is turned back on', () => {
    const size = quote({ packageId: 'deluxe', sizeId: 'large', extraIds: [] }).lines.find(isSizeLine)!;
    expect(lineAmount(size, money, true)).toBe('$60.00');
    expect(hiddenSize(size, true)).toBe(false);
  });

  it('never changes what is charged: totals still include the size charge and the deposit math is intact', () => {
    const q = quote({ packageId: 'deluxe', sizeId: 'large', extraIds: [] });
    expect(q.totalCents).toBe(7500 + 6000);
    expect(q.depositCents + q.balanceCents).toBe(q.totalCents);
  });

  it('has no size line to hide for a sedan, whose size charge is zero', () => {
    const q = quote({ packageId: 'interior', sizeId: 'sedan', extraIds: [] });
    expect(q.lines.some(isSizeLine)).toBe(false);
    expect(lineAmount({ label: sizes[0].name, cents: 0 }, money)).toBe('$0.00');
  });
});
