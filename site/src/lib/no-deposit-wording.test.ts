import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* The business does not take or mention a deposit. These are the files that hold text customers (or the owner's calendar
   draft) can read; the word must not appear in them. Internal field names such as depositCents / deposit_cents (the quote
   maths and the database column) are fine: the pattern only matches the word on its own. */
const files = [
  'src/data/agreement.ts', 'src/data/checklist.ts', 'src/pages/index.astro', 'src/pages/book.astro', 'src/layouts/Base.astro',
  'src/components/Header.astro', 'src/components/Footer.astro', 'src/lib/booking.ts', 'src/lib/order-card.ts',
  '../api/_calendar-request.ts', '../api/health.ts', '../api/request-booking.ts',
];
const WORD = /(?<![A-Za-z_])deposits?(?![A-Za-z_])/i;

describe('customer-facing wording', () => {
  it.each(files)('%s never says "deposit"', (file) => {
    const lines = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8').split('\n');
    const hits = lines.map((text, i) => ({ line: i + 1, text })).filter((l) => WORD.test(l.text));
    expect(hits).toEqual([]);
  });
});
