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
