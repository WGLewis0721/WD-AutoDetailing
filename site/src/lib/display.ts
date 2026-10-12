/* What the booking flow and the home page show about money. The switches live in SITE.display (data/site.ts);
   prices and totals are never changed here, only what is shown. */
import { sizes } from '../data/menu.js';
import { SITE } from '../data/site.js';

export const SHOW_SIZE_PRICES: boolean = SITE.display.sizePrices;

const sizeNames = new Set(sizes.map((s) => s.name));
/** The quote line that carries a vehicle-size charge (its label is the size name). */
export const isSizeLine = (line: { label: string }) => sizeNames.has(line.label);

export const SIZE_INCLUDED = 'Included in total';

/** A size-charge line whose price is hidden from customers (the charge stays in the total). */
export const hiddenSize = (line: { label: string; cents: number }, showSizePrices: boolean = SHOW_SIZE_PRICES) =>
  !showSizePrices && isSizeLine(line) && line.cents > 0;

/** The amount to show beside a quote line: the money, or "Included in total" for a hidden size charge. */
export const lineAmount = (line: { label: string; cents: number }, money: (cents: number) => string, showSizePrices: boolean = SHOW_SIZE_PRICES) =>
  hiddenSize(line, showSizePrices) ? SIZE_INCLUDED : money(line.cents);
