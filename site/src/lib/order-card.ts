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

/** Export the image-first Design B card, using the live site's own driveway and
 * transparent selected-vehicle artwork. No backend or screenshot dependency. */
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
    black: token('--black', '#0b0b0c'), gold: token('--gold', '#c8a45c'),
    goldHi: token('--gold-hi', '#e2c07a'), light: token('--white', '#ffffff'),
    muted: token('--muted-on-dark', '#b9b4a8'),
  };
  const withAlpha = (hex: string, opacity: number) =>
    /^#[0-9a-f]{6}$/i.test(hex)
      ? hex + Math.round(opacity * 255).toString(16).padStart(2, '0')
      : hex;

  // The scratch canvas is deliberately generous and trimmed afterward. Even
  // four-car orders and wrapped add-on names must not lose price information.
  const maxHeight = 1800 + data.vehicles.reduce((sum, car) =>
    sum + 240 + car.lines.length * 125, 0);
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH; canvas.height = maxHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('Image export is not supported on this device');
  const fill = (x: number, y: number, width: number, height: number, paint: string) => {
    ctx.fillStyle = paint; ctx.fillRect(x, y, width, height);
  };
  const label = (value: string, x: number, y: number, size = 23, paint = color.light, bold = false) => {
    ctx.font = (bold ? '700 ' : '500 ') + size + 'px ' + SANS;
    ctx.fillStyle = paint; ctx.fillText(value, x, y);
  };
  const right = (value: string, y: number, size = 27, paint = color.light) => {
    ctx.textAlign = 'right';
    label(value, WIDTH - PAD, y, size, paint, true);
    ctx.textAlign = 'left';
  };
  const serif = (value: string, x: number, y: number, size = 58, paint = color.light) => {
    ctx.font = size + 'px ' + SERIF; ctx.fillStyle = paint; ctx.fillText(value, x, y);
  };
  const rule = (y: number) => fill(PAD, y, SPAN, 1, withAlpha(color.light, .22));
  const textLines = (text: string, x: number, y: number, maxWidth: number, size: number, lineHeight: number, paint: string) => {
    ctx.font = '500 ' + size + 'px ' + SANS;
    const lines = wrap(ctx, text, maxWidth);
    lines.forEach((line, i) => label(line, x, y + i * lineHeight, size, paint));
    return lines.length * lineHeight;
  };

  fill(0, 0, WIDTH, maxHeight, color.black);
  const first = data.vehicles[0];
  const plate = await image(first.plateUrl);
  const car = await image(first.imageUrl);
  // Full bleed: the same two-layer registered composition as the configurator,
  // with no inset image frame or car-on-glow treatment.
  if (plate) cover(ctx, plate, 0, 0, WIDTH, 665);
  if (car) cover(ctx, car, 0, 0, WIDTH, 665);
  const gradient = ctx.createLinearGradient(0, 0, 0, 850);
  gradient.addColorStop(0, withAlpha(color.black, .44));
  gradient.addColorStop(.16, withAlpha(color.black, .06));
  gradient.addColorStop(.39, withAlpha(color.black, .32));
  gradient.addColorStop(.66, withAlpha(color.black, .89));
  gradient.addColorStop(.87, color.black);
  gradient.addColorStop(1, color.black);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, WIDTH, 850);

  label('MIRROR FINISH  /  ORDER SUMMARY', PAD, 76, 20, color.light, true);
  right('AWAITING CONFIRMATION', 76, 20, color.light);
  label('VEHICLE 1  /  YOUR DETAIL', PAD, 465, 20, color.goldHi, true);

  ctx.font = '76px ' + SERIF;
  const firstLines = wrap(ctx, first.name, SPAN);
  let y = 552;
  for (const line of firstLines) { serif(line, PAD, y, 76); y += 83; }
  label(first.packageName + ' detail', PAD, y + 2, 27);
  y += 62;

  label('REFERENCE', PAD, y, 19, color.muted, true);
  label(data.ref, PAD + 167, y, 21, color.light, true);
  y += 42;
  label('REQUESTED', PAD, y, 19, color.muted, true);
  y += textLines(data.when, PAD + 167, y, SPAN - 167, 21, 31, color.light);
  y += 30;

  for (let i = 0; i < data.vehicles.length; i++) {
    const v = data.vehicles[i];
    if (i) {
      label('VEHICLE ' + (i + 1), PAD, y, 19, color.goldHi, true);
      y += 56;
      ctx.font = '45px ' + SERIF;
      for (const line of wrap(ctx, v.name, SPAN)) { serif(line, PAD, y, 45); y += 51; }
      label(v.packageName + ' detail', PAD, y, 23, color.muted);
      y += 46;
    } else {
      label('YOUR SELECTED SERVICES', PAD, y, 19, color.goldHi, true);
      y += 36;
    }
    for (const line of v.lines) {
      ctx.font = '25px ' + SANS;
      const wrapped = wrap(ctx, line.label, SPAN - 205);
      const rowHeight = Math.max(48, wrapped.length * 33 + 5);
      for (let n = 0; n < wrapped.length; n++) {
        label(wrapped[n], PAD, y + n * 33, 25, color.muted);
      }
      right(cardMoney(line.cents), y, 27);
      y += rowHeight;
    }
    y += 18;
  }

  y += 12; rule(y);
  y += 51;
  label('Service total', PAD, y, 28, color.muted);
  right(cardMoney(data.totalCents), y, 36);
  y += 72;
  label('DEPOSIT AT CHECKOUT', PAD, y, 23, color.goldHi, true);
  ctx.textAlign = 'right';
  serif(cardMoney(data.depositCents), WIDTH - PAD, y + 20, 57, color.goldHi);
  ctx.textAlign = 'left';
  label('20% · after confirmation', PAD, y + 35, 20, color.muted);
  y += 91;
  label('Remaining balance after detail', PAD, y, 25, color.muted);
  right(cardMoney(data.balanceCents), y, 32);
  y += 42; rule(y);
  y += 50;
  label('Charged today', PAD, y, 23, color.muted);
  right('$0.00', y, 29, color.muted);
  y += 62;

  // Static representation of the clickable white pill on the live website.
  const pillY = y, pillH = 82;
  ctx.fillStyle = color.light;
  ctx.beginPath();
  ctx.roundRect(PAD, pillY, SPAN, pillH, 41);
  ctx.fill();
  ctx.textAlign = 'center';
  label('TEXT MY ORDER TO CONFIRM', WIDTH / 2, pillY + 52, 25, color.black, true);
  ctx.textAlign = 'left';
  y += pillH + 49;
  label('REQUEST ONLY  ·  NO PAYMENT COLLECTED', PAD, y, 19, color.muted, true);
  y += 28;
  label('Appointment and deposit instructions require confirmation.', PAD, y, 19, color.muted);

  if (y + 30 > maxHeight) throw Error('Order card layout exceeds export size');
  const output = document.createElement('canvas');
  output.width = WIDTH; output.height = Math.ceil(y + 57);
  const out = output.getContext('2d');
  if (!out) throw Error('Image export is unavailable');
  out.drawImage(canvas, 0, 0, WIDTH, output.height, 0, 0, WIDTH, output.height);
  return new Promise<Blob>((resolve, reject) => {
    output.toBlob(blob => blob ? resolve(blob) : reject(Error('PNG could not be generated')), 'image/png');
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
