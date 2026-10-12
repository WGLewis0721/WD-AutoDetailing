import { describe, expect, it } from 'vitest';
import { addonGroups, addonMenu, extras, findExtra, groupSavings, legacyExtras, optionsOf, packages } from '../data/menu';
import { buildPaymentLink, bookingCars, OrderError, validate, type CheckoutOrder } from './checkout';
import { priceExtras, quote, readiness } from './pricing';

const sel = (extraIds: string[]) => ({ packageId: 'interior', sizeId: 'sedan' as const, extraIds });
const stain = addonGroups.find((g) => g.id === 'stain-removal')!;
const refresh = addonGroups.find((g) => g.id === 'refresh-interior')!;

describe('add-on menu: combos with individually selectable items', () => {
  it('has the two treatments, each made of items that belong to it', () => {
    expect(addonGroups.map((g) => g.name)).toEqual(['Stain Removal Treatment', 'Refresh Interior Treatment']);
    expect(optionsOf(stain).map((o) => o.short)).toEqual(['Headliner', 'Upholstery', 'Carpet']);
    expect(optionsOf(refresh).map((o) => o.short)).toEqual(['Steam cleaning', 'Upholstery cleaning']);
    for (const g of addonGroups) for (const o of optionsOf(g)) expect(o.group).toBe(g.id);
  });

  it('prices a combo below its items, like a combo meal', () => {
    expect(optionsOf(stain).reduce((n, o) => n + o.cents, 0)).toBe(12000);
    expect(stain.cents).toBe(10000);
    expect(groupSavings(stain)).toBe(2000);
    expect(optionsOf(refresh).reduce((n, o) => n + o.cents, 0)).toBe(9500);
    expect(refresh.cents).toBe(8000);
    expect(groupSavings(refresh)).toBe(1500);
    for (const g of addonGroups) expect(groupSavings(g)).toBeGreaterThan(0);
  });

  it('shows each combo once, then the single add-ons, in menu order', () => {
    expect(addonMenu.map((m) => (m.kind === 'group' ? m.group.id : m.extra.id))).toEqual(['stain-removal', 'refresh-interior', 'pet-hair', 'decon', 'headlight']);
  });

  it('has unique add-on ids, and the retired Interior Deep Treatment is not on the menu', () => {
    const ids = [...extras, ...legacyExtras].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(extras.some((e) => e.id === 'deep-treatment')).toBe(false);
    expect(extras.some((e) => /deep treatment/i.test(e.name))).toBe(false);
  });
});

describe('pricing the toppings', () => {
  it('charges only the chosen items (just ham)', () => {
    const q = quote(sel(['refresh-steam']));
    expect(q.lines.map((l) => [l.label, l.cents])).toEqual([['Interior', 5000], ['Steam Cleaning', 5000]]);
    expect(q.totalCents).toBe(10000);
    expect(q.minutes).toBe(60 + 30);
  });

  it('charges the sum of two of three stain areas, with no discount', () => {
    const q = quote(sel(['stain-headliner', 'stain-carpet']));
    expect(q.totalCents).toBe(5000 + 3500 + 4000);
  });

  it('turns every item chosen into the combo (meat lovers): one line at the combo price', () => {
    const q = quote(sel(['stain-headliner', 'stain-upholstery', 'stain-carpet']));
    expect(q.lines.map((l) => [l.label, l.cents])).toEqual([['Interior', 5000], ['Stain Removal Treatment', 10000]]);
    expect(q.totalCents).toBe(15000);
    expect(q.minutes).toBe(60 + 20 + 30 + 25);
    expect(quote(sel(['refresh-upholstery', 'refresh-steam'])).lines[1]).toEqual({ label: 'Refresh Interior Treatment', cents: 8000 });
  });

  it('prices the same whichever order the items were tapped in', () => {
    const a = quote(sel(['stain-carpet', 'stain-headliner', 'stain-upholstery']));
    const b = quote(sel(['stain-headliner', 'stain-upholstery', 'stain-carpet']));
    expect(a.totalCents).toBe(b.totalCents);
  });

  it('drops back to item prices when one item is taken away from the combo', () => {
    const q = quote(sel(['stain-headliner', 'stain-upholstery']));
    expect(q.totalCents).toBe(5000 + 3500 + 4500);
  });

  it('prices a combo next to single add-ons and a second combo', () => {
    const q = quote(sel(['pet-hair', 'refresh-steam', 'refresh-upholstery', 'stain-carpet', 'headlight']));
    expect(q.totalCents).toBe(5000 + 7500 + 8000 + 4000 + 5000);
    expect(priceExtras(['pet-hair', 'refresh-steam', 'refresh-upholstery', 'stain-carpet', 'headlight']).map((e) => e.label))
      .toEqual(['Pet Hair Removal', 'Refresh Interior Treatment', 'Carpet Stain Removal', 'Headlight Restoration']);
  });

  it('counts a combo as one add-on for the progress bar and ignores ids it does not know', () => {
    expect(readiness(sel(['stain-headliner', 'stain-upholstery', 'stain-carpet']))).toBe(25 + 45 + 10); // size + package + one combo
    expect(priceExtras(['nope', 'decon'])).toHaveLength(1);
    expect(priceExtras([])).toEqual([]);
  });
});

describe('server side: validating and itemising the toppings', () => {
  const base: CheckoutOrder = {
    cars: [{ year: '2022', make: 'Toyota', model: 'Camry', packageId: 'interior', extraIds: [] }],
    date: '2026-10-30', startMin: 9 * 60,
    name: 'Jordan Smith', phone: '(334) 555-0123', email: 'jordan@example.com', street: '12 Oak St', city: 'Montgomery', zip: '36104',
  };
  const opts = { locationId: 'LOC1', ref: 'MF-TEST01', siteUrl: 'https://example.com/' };
  const withExtras = (extraIds: string[]): CheckoutOrder => ({ ...base, cars: [{ ...base.cars[0], extraIds }] });

  it('accepts every item, rejects a combo id sent as an add-on and duplicates', () => {
    for (const e of extras) expect(() => validate(withExtras([e.id]))).not.toThrow();
    expect(() => validate(withExtras(['stain-removal']))).toThrow(OrderError);
    expect(() => validate(withExtras(['stain-carpet', 'stain-carpet']))).toThrow(OrderError);
  });

  it('still accepts the retired Interior Deep Treatment from a page loaded before the change, at the price it showed', () => {
    expect(findExtra('deep-treatment')?.cents).toBe(7500);
    expect(() => validate(withExtras(['deep-treatment']))).not.toThrow();
    expect(quote(sel(['deep-treatment'])).totalCents).toBe(5000 + 7500);
    expect(bookingCars(withExtras(['deep-treatment']))[0].lines.map((l) => l.label)).toContain('Interior Deep Treatment');
  });

  it('sends items that are not in the Square catalog as their own priced lines, and a combo as one line', () => {
    const items = buildPaymentLink(withExtras(['refresh-steam', 'pet-hair']), opts).order.line_items;
    expect(items.map((l) => ('catalog_object_id' in l ? l.catalog_object_id : `${l.name} ${l.base_price_money.amount}`)))
      .toEqual([packages.find((p) => p.id === 'interior')!.square, 'Steam Cleaning 5000', findExtra('pet-hair')!.square]);
    const combo = buildPaymentLink(withExtras(['stain-headliner', 'stain-upholstery', 'stain-carpet']), opts).order.line_items;
    expect(combo).toHaveLength(2);
    expect(combo[1]).toMatchObject({ name: 'Stain Removal Treatment', base_price_money: { amount: 10000, currency: 'USD' } });
  });

  it('stores the items chosen with the order, and a combo shows as one priced line', () => {
    const car = bookingCars(withExtras(['refresh-steam', 'refresh-upholstery']))[0];
    expect(car.extraIds).toEqual(['refresh-steam', 'refresh-upholstery']);
    expect(car.lines.map((l) => [l.label, l.cents])).toEqual([['Interior', 5000], ['Refresh Interior Treatment', 8000]]);
    expect(car.totalCents).toBe(13000);
  });
});
