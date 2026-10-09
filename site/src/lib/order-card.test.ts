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
  it('keeps exact 20% deposit and outstanding balance in an order-specific filename', () => {
    expect(cardFilename(card.ref)).toBe('mirror-finish-order-MF-ABC12345.png');
    expect(cardTotals(card)).toEqual([
      { label: 'Service total', amount: '$325.00' },
      { label: 'Deposit at checkout (20%)', amount: '$65.00' },
      { label: 'Remaining balance after detail', amount: '$260.00' },
      { label: 'Charged today', amount: '$0.00' },
    ]);
  });

  it('composites BOTH the same driveway and selected transparent vehicle into a real PNG', async () => {
    const drawn: string[] = [];
    const labels: string[] = [];
    const images: unknown[] = [];
    const ctx = {
      fillStyle: '', strokeStyle: '', textAlign: 'left', textBaseline: 'alphabetic',
      font: '', lineWidth: 1,
      fillRect: vi.fn(), fillText: vi.fn((label: string) => { labels.push(label); }),
      drawImage: vi.fn((image: object) => { images.push(image); }),
      save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(),
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
    expect(labels).toContain('$65.00');
    expect(labels).toContain('AWAITING CONFIRMATION');
    expect(labels).toContain('$0.00');
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
