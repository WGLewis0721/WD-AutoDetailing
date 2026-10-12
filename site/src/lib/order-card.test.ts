import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cardFilename, cardTotals, renderOrderCardPng, shareCardBlob, type OrderCardData } from './order-card';

const card: OrderCardData = {
  ref: 'MF-ABC12345', when: 'Friday, October 30 at 2:00 PM',
  totalCents: 32500, depositCents: 6500, balanceCents: 26000,
  vehicles: [{ name: '2021 Chevrolet Corvette', packageName: 'Deluxe',
    plateUrl: '/models/plate.webp', imageUrl: '/models/coupe-car.webp',
    lines: [{ label: 'Deluxe', cents: 20000 },
      { label: 'Pet Hair and Stain Removal', cents: 7500 },
      { label: 'Headlight Restoration', cents: 5000 }],
  }],
};

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('shareable order card PNG', () => {
  it('uses an order-specific filename and lists only the service total and what is charged today', () => {
    expect(cardFilename(card.ref)).toBe('mirror-finish-order-MF-ABC12345.png');
    expect(cardTotals(card)).toEqual([
      { label: 'Service total', amount: '$325.00' },
      { label: 'Charged today', amount: '$0.00' },
    ]);
  });

  it('composites BOTH the same driveway and selected transparent vehicle into a real PNG', async () => {
    const drawn: string[] = [];
    const labels: string[] = [];
    const images: unknown[] = [];
    const gradientStops: {stop:number;color:string}[] = [];
    const ctx = {
      fillStyle: '', strokeStyle: '', textAlign: 'left', textBaseline: 'alphabetic',
      font: '', lineWidth: 1,
      fillRect: vi.fn(), fillText: vi.fn((label: string) => { labels.push(label); }),
      drawImage: vi.fn((image: object) => { images.push(image); }),
      save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(),
      fill: vi.fn(), roundRect: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: (stop: number, color: string) => { gradientStops.push({stop,color}); } })),
      strokeRect: vi.fn(), measureText: vi.fn((text: string) => ({ width: text.length * 15 })),
    };
    const canvas = () => ({
      width: 0, height: 0, getContext: () => ctx,
      toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(['order-card-image'], { type: 'image/png' })),
    });
    vi.stubGlobal('document', { fonts: { ready: Promise.resolve() }, documentElement: {}, createElement: canvas });
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (name: string) => name }));
    class MockImage {
      decoding = ''; crossOrigin = ''; naturalWidth = 1600; naturalHeight = 1000;
      onload?: () => void; onerror?: () => void;
      set src(value: string) { drawn.push(value); this.onload?.(); }
    }
    vi.stubGlobal('Image', MockImage);
    const result = await renderOrderCardPng(card);
    expect(result.type).toBe('image/png');
    expect(drawn).toEqual(['/models/plate.webp', '/models/coupe-car.webp']);
    expect(images.length).toBeGreaterThanOrEqual(3); // driveway + car + final canvas crop
    expect(labels).toContain('2021 Chevrolet Corvette');
    expect(labels).toContain('Friday, October 30 at 2:00 PM');
    expect(labels).toContain('Headlight Restoration');
    expect(labels).toContain('$325.00');
    expect(labels).not.toContain('$65.00');
    expect(labels).not.toContain('$260.00');
    expect(labels.join(' ')).not.toMatch(/deposit/i);
    expect(labels).toContain('AWAITING CONFIRMATION');
    expect(labels).toContain('TEXT MY ORDER TO CONFIRM');
    expect(gradientStops.length).toBeGreaterThanOrEqual(4);
    expect(ctx.roundRect).toHaveBeenCalled();
    expect(labels).toContain('$0.00');
  });

  it('shows a hidden size charge as included in the total instead of its price', async () => {
    const labels: string[] = [];
    const ctx = {
      fillStyle: '', strokeStyle: '', textAlign: 'left', textBaseline: 'alphabetic', font: '', lineWidth: 1,
      fillRect: vi.fn(), fillText: vi.fn((label: string) => { labels.push(label); }), drawImage: vi.fn(),
      save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), fill: vi.fn(), roundRect: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })), strokeRect: vi.fn(), measureText: vi.fn((text: string) => ({ width: text.length * 15 })),
    };
    const canvas = () => ({ width: 0, height: 0, getContext: () => ctx, toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(['x'], { type: 'image/png' })) });
    vi.stubGlobal('document', { fonts: { ready: Promise.resolve() }, documentElement: {}, createElement: canvas });
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (name: string) => name }));
    class MockImage { decoding = ''; crossOrigin = ''; naturalWidth = 1600; naturalHeight = 1000; onload?: () => void; onerror?: () => void; set src(_v: string) { this.onload?.(); } }
    vi.stubGlobal('Image', MockImage);
    const sized: OrderCardData = { ...card, totalCents: 37500, depositCents: 7500, balanceCents: 30000, vehicles: [{ ...card.vehicles[0], lines: [...card.vehicles[0].lines, { label: 'Standard SUV or Truck', cents: 4000, amount: 'Included in total' }] }] };
    await renderOrderCardPng(sized);
    expect(labels).toContain('Standard SUV or Truck');
    expect(labels).toContain('Included in total');
    expect(labels).not.toContain('$40.00');
  });

  it('does not export a mismatched or unpriced receipt', async () => {
    await expect(renderOrderCardPng({ ...card, depositCents: 6501 })).rejects.toThrow();
  });

  it('uses the native share sheet when it can send a PNG file', async () => {
    const share = vi.fn(async (_data: ShareData) => {});
    vi.stubGlobal('navigator', { canShare: () => true, share });
    const result = await shareCardBlob(new Blob(['card'], { type: 'image/png' }), cardFilename(card.ref), card.ref);
    expect(result).toBe('shared');
    const args = share.mock.calls[0][0] as {files: File[]};
    expect(args.files[0].type).toBe('image/png');
  });
});
