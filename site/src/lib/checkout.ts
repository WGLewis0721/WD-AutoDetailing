import { extras, packages, sizes, type SizeId } from '../data/menu';
import { SITE } from '../data/site';
import { quoteOrder, MAX_CARS, type OrderQuote } from './pricing';
import { bodyStyles, modelsFor } from './vehicles';

/* The order the booking page sends to the checkout function, and the Square Payment Link request built from it.
   Same idea as the AGT site: the browser only says what was chosen; the server re-prices it from this repo's own
   price list (menu.ts) and decides each car's size from its make and model, so edited prices or a "sedan" label
   on a truck change nothing. Square then shows every line the customer built, with the balance taken off as a
   discount so the card is charged exactly the 20% deposit. */

export interface CheckoutCar { year?: string; make?: string; model?: string; bodyStyle?: string; packageId: string; extraIds: string[] }
export interface CheckoutOrder {
  cars: CheckoutCar[];
  date: string; // YYYY-MM-DD
  startMin: number; // minutes after midnight
  name: string; phone: string; email: string;
  street: string; city: string; zip: string; notes?: string;
}

export interface SquareMoney { amount: number; currency: 'USD' }
export interface PaymentLinkRequest {
  idempotency_key: string;
  order: {
    location_id: string;
    reference_id: string;
    line_items: { name: string; quantity: '1'; base_price_money: SquareMoney; note?: string }[];
    discounts: { uid: string; name: string; type: 'FIXED_AMOUNT'; amount_money: SquareMoney; scope: 'ORDER' }[];
    metadata: Record<string, string>;
  };
  checkout_options: { redirect_url: string; ask_for_shipping_address: false; allow_tipping: false };
  pre_populated_data: { buyer_email?: string; buyer_phone_number?: string };
  payment_note: string;
}

export class OrderError extends Error {}

const usd = (amount: number): SquareMoney => ({ amount, currency: 'USD' });
const clip = (v: string, n: number) => (v.length > n ? v.slice(0, n - 1) + '…' : v);
const clean = (v: unknown, n = 200) => clip(String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim(), n);

/** Size class from make and model (the same table the booking page uses), or from the chosen body style. */
export function sizeFor(car: CheckoutCar): { size: SizeId; label: string } {
  if (car.bodyStyle) {
    const b = bodyStyles.find((x) => x.id === car.bodyStyle);
    if (!b) throw new OrderError(`Unknown body style: ${car.bodyStyle}`);
    return { size: b.size, label: b.label };
  }
  const m = modelsFor(clean(car.make, 40)).find((x) => x.name === car.model);
  if (!m) throw new OrderError(`Unknown vehicle: ${car.make ?? ''} ${car.model ?? ''}`.trim());
  return { size: m.size, label: [clean(car.year, 4), clean(car.make, 40), clean(car.model, 60)].filter(Boolean).join(' ') };
}

export function validate(o: CheckoutOrder): void {
  if (!Array.isArray(o.cars) || o.cars.length < 1 || o.cars.length > MAX_CARS) throw new OrderError(`Choose 1 to ${MAX_CARS} cars`);
  for (const c of o.cars) {
    if (!packages.some((p) => p.id === c.packageId)) throw new OrderError(`Unknown package: ${c.packageId}`);
    if (!Array.isArray(c.extraIds) || c.extraIds.some((e) => !extras.some((x) => x.id === e))) throw new OrderError('Unknown add-on');
    if (new Set(c.extraIds).size !== c.extraIds.length) throw new OrderError('Duplicate add-on');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date)) throw new OrderError('Invalid date');
  if (!Number.isInteger(o.startMin) || o.startMin < 0 || o.startMin >= 24 * 60) throw new OrderError('Invalid time');
  if (!(SITE.serviceArea as readonly string[]).includes(o.city)) throw new OrderError('Outside the service area');
  if (!clean(o.name) || !/\S+@\S+\.\S+/.test(o.email) || o.phone.replace(/\D/g, '').length !== 10) throw new OrderError('Missing contact details');
  if (!/^\d{5}$/.test(o.zip) || !clean(o.street)) throw new OrderError('Missing address');
}

/** Server-side quote: sizes come from sizeFor, never from the browser. */
export function priceOrder(o: CheckoutOrder): OrderQuote & { labels: string[] } {
  const resolved = o.cars.map((c) => ({ c, ...sizeFor(c) }));
  const q = quoteOrder(resolved.map(({ c, size, label }) => ({ label, sel: { packageId: c.packageId, sizeId: size, extraIds: c.extraIds } })));
  return { ...q, labels: resolved.map((r) => r.label) };
}

const timeLabel = (min: number) => `${((Math.floor(min / 60) + 11) % 12) + 1}:${String(min % 60).padStart(2, '0')} ${min < 720 ? 'AM' : 'PM'}`;

export function buildPaymentLink(o: CheckoutOrder, opts: { locationId: string; ref: string; siteUrl: string }): PaymentLinkRequest {
  validate(o);
  const q = priceOrder(o);
  const multi = o.cars.length > 1;
  const line_items: PaymentLinkRequest['order']['line_items'] = [];
  o.cars.forEach((c, i) => {
    const car = q.labels[i];
    const tag = multi ? `Car ${i + 1}: ` : '';
    const pkg = packages.find((p) => p.id === c.packageId)!;
    line_items.push({ name: clip(`${tag}${pkg.name} detail`, 500), quantity: '1', base_price_money: usd(pkg.cents), note: clip(car, 500) });
    const size = sizes.find((s) => s.id === sizeFor(c).size)!;
    if (size.cents > 0) line_items.push({ name: clip(`${tag}${size.name} size`, 500), quantity: '1', base_price_money: usd(size.cents), note: clip(car, 500) });
    for (const id of c.extraIds) {
      const e = extras.find((x) => x.id === id)!;
      line_items.push({ name: clip(`${tag}${e.name}`, 500), quantity: '1', base_price_money: usd(e.cents), note: clip(car, 500) });
    }
  });
  const sum = line_items.reduce((n, l) => n + l.base_price_money.amount, 0);
  if (sum !== q.totalCents) throw new Error(`Line items (${sum}) do not match the quote (${q.totalCents})`);

  const when = `${o.date} ${timeLabel(o.startMin)}`;
  const address = `${clean(o.street, 120)}, ${o.city}, AL ${o.zip}`;
  const phone = o.phone.replace(/\D/g, '');
  const siteUrl = opts.siteUrl.replace(/\/$/, '');
  return {
    idempotency_key: opts.ref,
    order: {
      location_id: opts.locationId,
      reference_id: opts.ref,
      line_items,
      discounts: q.balanceCents > 0 ? [{ uid: 'balance', name: `Balance due after your detail (${(q.balanceCents / 100).toFixed(2)})`, type: 'FIXED_AMOUNT', amount_money: usd(q.balanceCents), scope: 'ORDER' }] : [],
      // Square allows 10 metadata entries of up to 255 characters; the webhook (next step) reads these back.
      metadata: {
        ref: opts.ref,
        appointment: when,
        minutes: String(q.minutes),
        customer: clean(o.name, 255),
        phone,
        email: clean(o.email, 255),
        address: clip(address, 255),
        vehicles: clip(q.labels.join(' / '), 255),
        total_cents: String(q.totalCents),
        balance_cents: String(q.balanceCents),
      },
    },
    checkout_options: { redirect_url: `${siteUrl}/book/?paid=${encodeURIComponent(opts.ref)}`, ask_for_shipping_address: false, allow_tipping: false },
    pre_populated_data: { buyer_email: clean(o.email, 255), buyer_phone_number: `+1${phone}` },
    payment_note: clip(`${opts.ref} | ${when} | ${clean(o.name, 80)} | ${address}${o.notes ? ' | Notes: ' + clean(o.notes, 200) : ''}`, 500),
  };
}
