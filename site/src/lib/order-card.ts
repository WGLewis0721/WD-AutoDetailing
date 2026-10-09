/* Export an on-brand, genuinely shareable PNG without external image services.
 * Canvas uses the same driveway plate, transparent car cutouts, and design
 * tokens as the booking configurator. No customer details leave the device.
 */
export interface CardLine { label: string; cents: number }
export interface CardVehicle {
  name: string; packageName: string; plateUrl: string; imageUrl: string | null; lines: CardLine[];
}
export interface OrderCardData {
  ref: string; when: string; vehicles: CardVehicle[];
  totalCents: number; depositCents: number; balanceCents: number;
}

export const cardFilename = (ref: string) =>
  'mirror-finish-order-' + (ref.match(/^MF-[A-Z0-9]{8}$/)?.[0] || 'request') + '.png';
export const cardMoney = (cents: number) => '$' + (cents / 100).toFixed(2);
export const cardTotals = (data: OrderCardData) => [
  { label: 'Service total', amount: cardMoney(data.totalCents) },
  { label: 'Deposit at checkout (20%)', amount: cardMoney(data.depositCents) },
  { label: 'Remaining balance after detail', amount: cardMoney(data.balanceCents) },
  { label: 'Charged today', amount: '$0.00' },
];

const WIDTH = 1000, PAD = 62, SPAN = WIDTH - PAD * 2;
const SERIF = '"Instrument Serif", Georgia, serif';
const SANS = '"Manrope Variable", Arial, sans-serif';

async function image(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return null;
  const item = new Image();
  item.decoding = 'async';
  item.crossOrigin = 'anonymous';
  return new Promise(resolve => {
    item.onload = () => resolve(item);
    item.onerror = () => resolve(null);
    item.src = src;
  });
}

function cover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ratio = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const iw = image.naturalWidth * ratio, ih = image.naturalHeight * ratio;
  ctx.drawImage(image, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line); line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

/** Returns PNG bytes: same site driveway/vehicle composition as the live receipt. */
export async function renderOrderCardPng(data: OrderCardData): Promise<Blob> {
  if (!/^MF-[A-Z0-9]{8}$/.test(data.ref) || !data.vehicles.length ||
      ![data.totalCents, data.depositCents, data.balanceCents].every(Number.isSafeInteger) ||
      data.totalCents !== data.depositCents + data.balanceCents) {
    throw Error('Order card could not be prepared');
  }
  if (document.fonts?.ready) await document.fonts.ready;
  const style = getComputedStyle(document.documentElement);
  const token = (key: string, fallback: string) => style.getPropertyValue(key).trim() || fallback;
  const color = {
    black: token('--black', 'black'), gold: token('--gold', 'goldenrod'),
    goldHi: token('--gold-hi', 'gold'), dark: token('--ink-2', 'black'),
    light: token('--white', 'white'), muted: token('--muted-on-dark', 'silver'),
    rule: token('--line-dark', 'gray'),
  };
  // Item heights include the exact number of line items; the PNG never crops a multi-car order.
  const cardHeight = 1000 + data.vehicles.reduce((sum, car) =>
    sum + 900 + car.lines.length * 140, 0);
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH; canvas.height = cardHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('Image export is not supported on this device');
  const fill = (x: number, y: number, w: number, h: number, paint: string) => {
    ctx.fillStyle = paint; ctx.fillRect(x, y, w, h);
  };
  const label = (value: string, x: number, y: number, size = 23, paint = color.light, bold = false) => {
    ctx.font = (bold ? '700 ' : '500 ') + size + 'px ' + SANS;
    ctx.fillStyle = paint; ctx.fillText(value, x, y);
  };
  const right = (value: string, y: number, size = 26, paint = color.light) => {
    ctx.textAlign = 'right'; label(value, WIDTH - PAD, y, size, paint, true); ctx.textAlign = 'left';
  };
  const rule = (y: number) => fill(PAD, y, SPAN, 2, color.rule);
  const serif = (value: string, x: number, y: number, size = 55, paint = color.light) => {
    ctx.font = size + 'px ' + SERIF; ctx.fillStyle = paint; ctx.fillText(value, x, y);
  };
  fill(0, 0, WIDTH, cardHeight, color.black);
  fill(0, 0, WIDTH, 10, color.gold);
  label('MIRROR FINISH  /  ORDER SUMMARY', PAD, 84, 23, color.goldHi, true);
  serif('Detail request', PAD, 163, 67);
  label('AWAITING CONFIRMATION', PAD, 216, 22, color.goldHi, true);
  rule(248);
  label('REFERENCE', PAD, 292, 18, color.muted, true);
  label(data.ref, PAD + 150, 292, 23, color.light, true);
  label('REQUESTED', PAD, 333, 18, color.muted, true);
  label(data.when, PAD + 150, 333, 22, color.light, true);
  let y = 372;
  ctx.textBaseline = 'alphabetic';
  const ready = await Promise.all(data.vehicles.map(async v =>
    ({ plate: await image(v.plateUrl), vehicle: await image(v.imageUrl) })));
  for (let i = 0; i < data.vehicles.length; i++) {
    const car = data.vehicles[i], art = ready[i];
    fill(PAD, y, SPAN, 354, color.dark);
    ctx.save();
    ctx.beginPath(); ctx.rect(PAD + 2, y + 2, SPAN - 4, 350); ctx.clip();
    // Both bitmaps use the exact same original art frame, so the transparent
    // car remains registered to the real driveway rather than a generic glow.
    if (art.plate) cover(ctx, art.plate, PAD, y, SPAN, 354);
    if (art.vehicle) cover(ctx, art.vehicle, PAD, y, SPAN, 354);
    else { serif('MIRROR FINISH', PAD + 46, y + 190, 48, color.goldHi); }
    ctx.restore();
    y += 390;
    label('VEHICLE ' + (i + 1), PAD, y, 22, color.goldHi, true);
    ctx.font = '53px ' + SERIF;
    const nameLines = wrap(ctx, car.name, SPAN);
    y += 58;
    for (const line of nameLines) { serif(line, PAD, y, 53); y += 56; }
    label(car.packageName + ' detail', PAD, y + 7, 26, color.muted);
    y += 45;
    for (const line of car.lines) {
      rule(y);
      ctx.font = '24px ' + SANS;
      const words = wrap(ctx, line.label, SPAN - 200);
      for (let j = 0; j < words.length; j++) {
        label(words[j], PAD, y + 37 + j * 30, 24, color.muted);
      }
      right(cardMoney(line.cents), y + 37, 26);
      y += Math.max(51, 37 + words.length * 30);
    }
    y += 35;
  }
  rule(y); y += 58;
  label('SERVICE TOTAL', PAD, y, 28, color.muted, true);
  right(cardMoney(data.totalCents), y, 39);
  y += 36;
  fill(PAD, y, SPAN, 114, color.dark);
  ctx.strokeStyle = color.gold; ctx.lineWidth = 2;
  ctx.strokeRect(PAD + 1, y + 1, SPAN - 2, 112);
  label('DEPOSIT AT CHECKOUT  /  AFTER CONFIRMATION', PAD + 22, y + 48, 21, color.goldHi, true);
  label('20%  ·  NOT CHARGED YET', PAD + 22, y + 83, 20, color.goldHi);
  ctx.textAlign = 'right';
  serif(cardMoney(data.depositCents), WIDTH - PAD - 22, y + 81, 54, color.goldHi);
  ctx.textAlign = 'left';
  y += 170;
  label('REMAINING BALANCE AFTER DETAIL', PAD, y, 24, color.muted, true);
  right(cardMoney(data.balanceCents), y, 33);
  y += 46; rule(y); y += 53;
  label('CHARGED TODAY', PAD, y, 26, color.goldHi, true);
  right('$0.00', y, 37, color.goldHi);
  y += 50;
  label('REQUEST ONLY  ·  APPOINTMENT NOT YET CONFIRMED', PAD, y, 18, color.muted, true);
  // Trim the generous scratch canvas to the actual receipt length; long multi-car
  // orders never crop or end in large blank black space.
  if (y + 24 > cardHeight) throw Error('Order card layout exceeds export size');
  const finished = document.createElement('canvas');
  finished.width = WIDTH; finished.height = Math.ceil(y + 50);
  const out = finished.getContext('2d');
  if (!out) throw Error('Image export is unavailable');
  out.drawImage(canvas, 0, 0, WIDTH, finished.height, 0, 0, WIDTH, finished.height);
  return new Promise<Blob>((resolve, reject) => {
    finished.toBlob(blob => blob ? resolve(blob) : reject(Error('PNG could not be generated')), 'image/png');
  });
}

export function downloadCardBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove();
  // iOS Safari may delay initiating downloads, so do not revoke immediately.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function shareCardBlob(blob: Blob, name: string, ref: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], name, { type: 'image/png' });
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: 'Mirror Finish detail request ' + ref, files: [file] });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
      // Unsupported or failed share sheet: still provide the PNG.
    }
  }
  downloadCardBlob(blob, name);
  return 'downloaded';
}
