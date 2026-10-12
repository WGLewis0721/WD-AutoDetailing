/* Fills the top of the downloadable service checklist with the customer's own order: their name, the vehicle, the time,
   and a check in the package and add-on boxes they chose. It works on the real checklist PDF (the same design customers
   can download blank) in the browser, so nothing about the order is sent anywhere. One vehicle gets the two checklist
   pages; an order with several vehicles gets a checklist per vehicle. Where each field and box sits comes from
   checklist-layout.json, which `npm run checklist` writes when it builds the PDF. */
import layout from '../data/checklist-layout.json';

export interface ChecklistVehicle { label: string; packageId: string | null; extraIds: string[] }
export interface ChecklistFill {
  customer: string; when: string; ref?: string; vehicles: ChecklistVehicle[];
}

type Spot = { x: number; y: number; w: number; h: number };
const spots = layout as unknown as {
  colors: Record<'black' | 'goldHi' | 'goldDeep' | 'muted', [number, number, number]>;
  fields: Record<'customer' | 'vehicle' | 'date' | 'detailer', Spot>;
  picks: Record<string, Spot>; slots: { ref: Spot };
};

export const checklistFilename = (ref?: string) => `Mirror-Finish-Checklist${ref && /^MF-[A-Z0-9]{8}$/.test(ref) ? '-' + ref : ''}.pdf`;

export async function fillChecklist(template: ArrayBuffer | Uint8Array, data: ChecklistFill): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb: color } = await import('pdf-lib');
  const src = await PDFDocument.load(template);
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.HelveticaBold);
  const tint = (name: keyof typeof spots.colors) => color(...spots.colors[name]);

  // Standard PDF fonts only cover Latin-1 text; drop anything else rather than failing the whole download.
  const printable = (text: string) => [...text.replace(/\s+/g, ' ').trim()].filter((ch) => { try { font.encodeText(ch); return true; } catch { return false; } }).join('');
  /** The largest size (down to min) that fits the width, shortened with an ellipsis if even the smallest does not. */
  const fit = (text: string, width: number, max: number, min = 6.5) => {
    let size = max;
    while (size > min && font.widthOfTextAtSize(text, size) > width) size -= 0.25;
    let shown = text;
    while (shown.length > 1 && font.widthOfTextAtSize(shown, size) > width) shown = shown.slice(0, -1);
    return { shown: shown === text ? text : shown.replace(/\s*$/, '') + '...', size };
  };

  const vehicles = data.vehicles.length ? data.vehicles : [{ label: '', packageId: null, extraIds: [] }];
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    const [front, back] = await out.copyPages(src, [0, 1]);
    out.addPage(front); out.addPage(back);

    const write = (spot: Spot, text: string, max: number, tone: keyof typeof spots.colors = 'black', align: 'left' | 'right' = 'left') => {
      const clean = printable(text);
      if (!clean) return;
      const { shown, size } = fit(clean, spot.w - 4, max);
      const width = font.widthOfTextAtSize(shown, size);
      front.drawText(shown, { x: align === 'right' ? spot.x + spot.w - width : spot.x + 2, y: spot.y + 5, size, font, color: tint(tone) });
    };
    write(spots.fields.customer, data.customer, 10);
    write(spots.fields.vehicle, v.label, 10);
    write(spots.fields.date, data.when, 9);
    const tag = [data.ref, vehicles.length > 1 ? `VEHICLE ${i + 1} OF ${vehicles.length}` : ''].filter(Boolean).join('  ·  ');
    if (tag) write(spots.slots.ref, tag, 9, 'goldHi', 'right');

    // A check mark in each box they chose: the package, then every add-on.
    for (const id of [v.packageId, ...v.extraIds]) {
      const box = id ? spots.picks[id] : undefined;
      if (!box) continue;
      const pt = (fx: number, fy: number) => ({ x: box.x + box.w * fx, y: box.y + box.h * fy });
      const opts = { thickness: 1.9, color: tint('black') };
      front.drawLine({ start: pt(0.2, 0.52), end: pt(0.42, 0.24), ...opts });
      front.drawLine({ start: pt(0.42, 0.24), end: pt(0.82, 0.8), ...opts });
    }
  }
  out.setTitle('Mirror Finish service checklist');
  out.setProducer('Mirror Finish Mobile Detailing');
  out.setCreator('Mirror Finish Mobile Detailing');
  return out.save();
}
