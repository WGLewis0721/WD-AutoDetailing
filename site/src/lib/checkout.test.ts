import { describe, expect, it } from 'vitest';
import { buildPaymentLink, OrderError, type CheckoutOrder } from './checkout';

const base: CheckoutOrder = {
  cars: [{ year: '2022', make: 'Toyota', model: 'Camry', packageId: 'deluxe', extraIds: [] }],
  date: '2026-10-10', startMin: 9 * 60,
  name: 'Jordan Smith', phone: '(334) 555-0123', email: 'jordan@example.com',
  street: '12 Oak St', city: 'Montgomery', zip: '36104', notes: 'Gate code 1234',
};
const opts = { locationId: 'LOC1', ref: 'MF-TEST01', siteUrl: 'https://example.com/site/' };
const charged = (r: ReturnType<typeof buildPaymentLink>) =>
  r.order.line_items.reduce((n, l) => n + l.base_price_money.amount, 0) - r.order.discounts.reduce((n, d) => n + d.amount_money.amount, 0);

describe('buildPaymentLink', () => {
  it('lists the package and charges exactly the 20% deposit', () => {
    const r = buildPaymentLink(base, opts);
    expect(r.order.line_items.map((l) => l.name)).toEqual(['Deluxe detail']);
    expect(charged(r)).toBe(1200); // $60 Deluxe, sedan size, 20% deposit
    expect(r.order.discounts[0].amount_money.amount).toBe(4800);
    expect(r.checkout_options.redirect_url).toBe('https://example.com/site/book/?paid=MF-TEST01');
    expect(r.pre_populated_data.buyer_phone_number).toBe('+13345550123');
  });

  it('sizes each car from its make and model, not from the browser', () => {
    const r = buildPaymentLink({ ...base, cars: [{ year: '2021', make: 'Chevrolet', model: 'Suburban', packageId: 'deluxe', extraIds: ['headlight'] }] }, opts);
    expect(r.order.line_items.map((l) => [l.name, l.base_price_money.amount])).toEqual([
      ['Deluxe detail', 6000], ['Van / 3-Row SUV / HD Truck size', 6000], ['Headlight Restoration', 10000],
    ]);
    expect(charged(r)).toBe(4400); // 20% of $220
  });

  it('itemises every car in a multi-car order and rounds the deposit once', () => {
    const r = buildPaymentLink({ ...base, cars: [
      { year: '2020', make: 'Honda', model: 'Civic', packageId: 'exterior', extraIds: ['decon'] },
      { bodyStyle: 'truck', packageId: 'interior', extraIds: ['shampoo-steam', 'deep-treatment'] },
    ] }, opts);
    expect(r.order.line_items.every((l) => /^Car [12]: /.test(l.name))).toBe(true);
    const total = 4000 + 4000 + 4000 + 4000 + 7500 + 7500; // ext + decon + int + standard truck + 2 extras
    expect(charged(r)).toBe(Math.round(total * 0.2));
    expect(r.order.metadata.vehicles).toContain('Honda Civic');
  });

  it('keeps Square metadata within its limits', () => {
    const r = buildPaymentLink({ ...base, name: 'x'.repeat(400), notes: 'y'.repeat(900) }, opts);
    expect(Object.keys(r.order.metadata).length).toBeLessThanOrEqual(10);
    for (const v of Object.values(r.order.metadata)) expect(v.length).toBeLessThanOrEqual(255);
    expect(r.payment_note.length).toBeLessThanOrEqual(500);
  });

  it.each([
    ['unknown package', { cars: [{ ...base.cars[0], packageId: 'platinum' }] }],
    ['unknown add-on', { cars: [{ ...base.cars[0], extraIds: ['free-wax'] }] }],
    ['unknown vehicle', { cars: [{ make: 'Toyota', model: 'Hovercraft', packageId: 'deluxe', extraIds: [] }] }],
    ['too many cars', { cars: Array(5).fill(base.cars[0]) }],
    ['outside the area', { city: 'Atlanta' }],
    ['bad phone', { phone: '555' }],
  ])('rejects %s', (_, patch) => {
    expect(() => buildPaymentLink({ ...base, ...patch } as CheckoutOrder, opts)).toThrow(OrderError);
  });
});
