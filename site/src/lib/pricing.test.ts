import { describe, expect, it } from 'vitest';
import { quote } from './pricing';

describe('quote', () => {
  it('prices package + size + extras and rounds the 20% deposit once', () => {
    const q = quote({ packageId: 'deluxe', sizeId: 'standard', extraIds: ['shampoo-steam'] });
    expect(q.totalCents).toBe(6000 + 4000 + 7500);
    expect(q.depositCents).toBe(3500);
    expect(q.balanceCents).toBe(14000);
  });
  it('sedan adds nothing', () => {
    expect(quote({ packageId: 'exterior', sizeId: 'sedan', extraIds: [] }).totalCents).toBe(4000);
  });
  it('empty build is zero', () => {
    expect(quote({ packageId: null, sizeId: null, extraIds: [] }).totalCents).toBe(0);
  });
  it('rounds odd deposits to whole cents', () => {
    expect(quote({ packageId: 'interior', sizeId: 'small', extraIds: ['decon'] }).depositCents).toBe(2000);
  });
});

import { MAX_CARS, quoteOrder } from './pricing';
import { slotsFor } from './schedule';

describe('multi-car orders', () => {
  const a = { packageId: 'deluxe', sizeId: 'standard' as const, extraIds: [] };
  const b = { packageId: 'exterior', sizeId: 'sedan' as const, extraIds: ['decon'] };
  it('sums per-car totals and takes 20% of the grand total once', () => {
    const q = quoteOrder([{ label: 'Car 1', sel: a }, { label: 'Car 2', sel: b }]);
    expect(q.totalCents).toBe(10000 + 8000);
    expect(q.depositCents).toBe(3600);
    expect(q.balanceCents).toBe(14400);
    expect(q.minutes).toBe(120 + 60 + 30);
  });
  it('never prices more than four cars', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ label: `Car ${i + 1}`, sel: b }));
    expect(MAX_CARS).toBe(4);
    expect(quoteOrder(many).cars).toHaveLength(4);
  });
  it('offers fewer start times as the order gets longer', () => {
    const one = slotsFor('2026-10-10', 120).length;
    const four = slotsFor('2026-10-10', 600).length;
    expect(one).toBeGreaterThan(four);
    expect(slotsFor('2026-10-10', 700)).toHaveLength(0);
  });
});
