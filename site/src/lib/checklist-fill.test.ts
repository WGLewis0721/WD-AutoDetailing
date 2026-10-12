import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { decodePDFRawStream, PDFRawStream } from 'pdf-lib';
import layout from '../data/checklist-layout.json';
import { extras, packages } from '../data/menu';
import { checklistFilename, fillChecklist, type ChecklistFill } from './checklist-fill';

const template = readFileSync(new URL('../../public/Mirror-Finish-Service-Checklist.pdf', import.meta.url));

const order: ChecklistFill = {
  customer: 'Jordan Smith', when: 'Wed, Oct 14, 8:00 AM', ref: 'MF-0A1B2C3D',
  vehicles: [{ label: '2022 Toyota Camry', packageId: 'deluxe', extraIds: ['refresh-steam', 'headlight'] }],
};

const hex = (text: string) => [...text].map((ch) => ch.charCodeAt(0).toString(16).padStart(2, '0')).join('').toUpperCase();
/** The drawing instructions of one page of the output, as text. */
function pageContent(doc: PDFDocument, index: number): string {
  const parts = doc.getPage(index).node.Contents();
  const streams = parts && 'asArray' in parts ? (parts as unknown as { asArray(): unknown[] }).asArray() : [parts];
  return streams.map((ref) => {
    const stream = doc.context.lookup(ref as never);
    return stream instanceof PDFRawStream ? Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1') : '';
  }).join('\n');
}
const strokes = (content: string) => (content.match(/ l\s/g) ?? []).length;

describe('layout of the fillable checklist', () => {
  it('has a spot for every field, every package, every add-on and the order tag', () => {
    expect(Object.keys(layout.fields).sort()).toEqual(['customer', 'date', 'detailer', 'vehicle']);
    for (const id of [...packages, ...extras].map((x) => x.id)) expect(layout.picks, `no box for ${id}`).toHaveProperty(id);
    expect(layout.slots).toHaveProperty('ref');
    for (const s of [...Object.values(layout.fields), ...Object.values(layout.picks), ...Object.values(layout.slots)]) {
      expect(s.x).toBeGreaterThan(0); expect(s.x + s.w).toBeLessThan(layout.page.w);
      expect(s.y).toBeGreaterThan(0); expect(s.y + s.h).toBeLessThan(layout.page.h);
    }
  });

  it('was written for the current checklist wording', () => {
    expect(layout.content).toBe(readFileSync(new URL('../data/checklist.hash', import.meta.url), 'utf8').trim());
  });
});

describe('filling the checklist with a customer\'s order', () => {
  it('keeps the two pages for one vehicle and writes the order at the top of the first', async () => {
    const bytes = await fillChecklist(template, order);
    if (process.env.WRITE_SAMPLE) writeFileSync(process.env.WRITE_SAMPLE, bytes);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getTitle()).toBe('Mirror Finish service checklist');
    const first = pageContent(doc, 0);
    for (const text of ['Jordan Smith', '2022 Toyota Camry', 'Wed, Oct 14, 8:00 AM', 'MF-0A1B2C3D']) expect(first, text).toContain(hex(text));
    expect(pageContent(doc, 1)).not.toContain(hex('Jordan Smith')); // page 2 is untouched
  });

  it('checks exactly the chosen package and add-on boxes (two strokes per check mark)', async () => {
    const doc = await PDFDocument.load(await fillChecklist(template, order));
    const blank = await PDFDocument.load(template);
    expect(strokes(pageContent(doc, 0)) - strokes(pageContent(blank, 0))).toBe(3 * 2); // deluxe + 2 add-ons
    // A whole combo is every one of its items: the three stain removal boxes are all checked, a single item checks only its own.
    const combo = await PDFDocument.load(await fillChecklist(template, { ...order, vehicles: [{ label: 'Car', packageId: 'interior', extraIds: ['stain-headliner', 'stain-upholstery', 'stain-carpet'] }] }));
    expect(strokes(pageContent(combo, 0)) - strokes(pageContent(blank, 0))).toBe(4 * 2);
    const one = await PDFDocument.load(await fillChecklist(template, { ...order, vehicles: [{ label: 'Car', packageId: 'interior', extraIds: ['stain-carpet'] }] }));
    expect(strokes(pageContent(one, 0)) - strokes(pageContent(blank, 0))).toBe(2 * 2);
    const none = await PDFDocument.load(await fillChecklist(template, { ...order, vehicles: [{ label: 'Car', packageId: null, extraIds: [] }] }));
    expect(strokes(pageContent(none, 0)) - strokes(pageContent(blank, 0))).toBe(0);
  });

  it('makes a checklist per vehicle, each with its own vehicle and choices', async () => {
    const doc = await PDFDocument.load(await fillChecklist(template, {
      ...order,
      vehicles: [order.vehicles[0], { label: '2020 Honda Civic', packageId: 'interior', extraIds: [] }],
    }));
    expect(doc.getPageCount()).toBe(4);
    expect(pageContent(doc, 0)).toContain(hex('2022 Toyota Camry'));
    expect(pageContent(doc, 0)).toContain(hex('VEHICLE 1 OF 2'));
    expect(pageContent(doc, 2)).toContain(hex('2020 Honda Civic'));
    expect(pageContent(doc, 2)).toContain(hex('VEHICLE 2 OF 2'));
    expect(pageContent(doc, 2)).not.toContain(hex('2022 Toyota Camry'));
  });

  it('survives text a PDF standard font cannot print and very long names', async () => {
    const bytes = await fillChecklist(template, {
      customer: 'Zoë 🚗 Nakamura-Fitzgerald-Montgomery-Wellington', when: 'Wed, Oct 14, 8:00 AM',
      vehicles: [{ label: '2024 Mercedes-Benz Sprinter Cargo Van High Roof Extended', packageId: 'exterior', extraIds: ['decon'] }],
    });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  });

  it('works with no vehicles at all (blank fields) and names the file after the reference', async () => {
    expect((await PDFDocument.load(await fillChecklist(template, { customer: '', when: '', vehicles: [] }))).getPageCount()).toBe(2);
    expect(checklistFilename('MF-0A1B2C3D')).toBe('Mirror-Finish-Checklist-MF-0A1B2C3D.pdf');
    expect(checklistFilename('not-a-ref')).toBe('Mirror-Finish-Checklist.pdf');
    expect(checklistFilename()).toBe('Mirror-Finish-Checklist.pdf');
  });
});
