import { describe, expect, it } from 'vitest';
import { buildPaymentLink, lineTotal, OrderError, type CheckoutOrder } from './checkout';
import { extras, packages } from '../data/menu';

const base: CheckoutOrder = {
  cars: [{ year: '2022', make: 'Toyota', model: 'Camry', packageId: 'deluxe', extraIds: [] }],
  date: '2026-10-10', startMin: 9 * 60,
  name: 'Jordan Smith', phone: '(334) 555-0123', email: 'jordan@example.com',
  street: '12 Oak St', city: 'Montgomery', zip: '36104', notes: 'Gate code 1234',
};
const opts = { locationId: 'LOC1', ref: 'MF-TEST01', siteUrl: 'https://example.com/site/' };
const charged = (r: ReturnType<typeof buildPaymentLink>) =>
  lineTotal(r.order.line_items) - r.order.discounts.reduce((n, d) => n + d.amount_money.amount, 0);
const lines = (r: ReturnType<typeof buildPaymentLink>) =>
  r.order.line_items.map((l) => ('catalog_object_id' in l ? l.catalog_object_id : `${l.name} ${l.base_price_money.amount}`));

/* The Mirror Finish Square catalog as read on 2026-10-03 (item-variation ID -> price). Square charges these for
   catalog lines, so the website must quote the same. If prices change in Square, update menu.ts and this table. */
const SQUARE_CATALOG: Record<string, [string, number]> = {
  FTS5EPOWPWUIMLQC5EP2UIXJ: ['Deluxe Detail', 20000],
  R2RWG6N5PK7ZJENI25APGMLL: ['Exterior Detail', 10000],
  '4BKQZYOKRBMH3W5S3RHCY35C': ['Interior Detail', 10000],
  LGZQX44C25AZZI4CVOPMWD5T: ['Interior Deep Treatment', 7500],
  LHFNWPMKQQGMBQ6OBEQJRFNY: ['Pet Hair and Stain Removal', 7500],
  ME7R5HV4XSEHJ4WPTUFYWXHY: ['Paint and Glass Decontamination', 4000],
  F6HKSVYUHQXRUIUJWUTXJUX2: ['Headlight Restoration', 5000],
};

describe('menu matches the Square catalog', () => {
  it.each([...packages, ...extras].map((x) => [x.name, x.square, x.cents] as const))('%s', (_, id, cents) => {
    expect(SQUARE_CATALOG[id], `unknown Square variation ${id}`).toBeDefined();
    expect(cents).toBe(SQUARE_CATALOG[id][1]);
  });
});

describe('buildPaymentLink', () => {
  it('sends the Square catalog item and charges exactly the 20% deposit', () => {
    const r = buildPaymentLink(base, opts);
    expect(lines(r)).toEqual(['FTS5EPOWPWUIMLQC5EP2UIXJ']); // Deluxe Detail
    expect(r.order.line_items[0].note).toBe('2022 Toyota Camry');
    expect(charged(r)).toBe(4000); // $200 Deluxe, sedan size, 20% deposit
    expect(r.order.discounts[0].amount_money.amount).toBe(16000);
    expect(r.checkout_options.redirect_url).toBe('https://example.com/site/book/?paid=MF-TEST01');
    expect(r.pre_populated_data.buyer_phone_number).toBe('+13345550123');
  });

  it('sizes each car from its make and model, not from the browser', () => {
    const r = buildPaymentLink({ ...base, cars: [{ year: '2021', make: 'Chevrolet', model: 'Suburban', packageId: 'deluxe', extraIds: ['headlight'] }] }, opts);
    expect(lines(r)).toEqual(['FTS5EPOWPWUIMLQC5EP2UIXJ', 'Vehicle size: Van / 3-Row SUV / HD Truck 6000', 'F6HKSVYUHQXRUIUJWUTXJUX2']);
    expect(charged(r)).toBe(6200); // 20% of $200 + $60 + $50
  });

  it('itemises every car in a multi-car order and rounds the deposit once', () => {
    const r = buildPaymentLink({ ...base, cars: [
      { year: '2020', make: 'Honda', model: 'Civic', packageId: 'exterior', extraIds: ['decon'] },
      { bodyStyle: 'truck', packageId: 'interior', extraIds: ['pet-hair', 'deep-treatment'] },
    ] }, opts);
    expect(r.order.line_items.every((l) => /^Car [12]: /.test(l.note ?? ''))).toBe(true);
    const total = 10000 + 4000 + 10000 + 4000 + 7500 + 7500; // ext + decon + int + standard truck + 2 extras
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
