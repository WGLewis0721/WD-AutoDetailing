import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addonSections, checklist, checklistFingerprint, packageSections } from '../data/checklist';
import { addonMenu, extras, packages } from '../data/menu';

const pdfUrl = new URL('../../public/Mirror-Finish-Service-Checklist.pdf', import.meta.url);
const hashUrl = new URL('../data/checklist.hash', import.meta.url);

describe('service checklist content', () => {
  it('covers every package: Deluxe is the Interior and Exterior details together', () => {
    const ids = packageSections.map((s) => s.id);
    expect(ids).toEqual(['interior', 'exterior']);
    for (const p of packages) expect(['deluxe', ...ids]).toContain(p.id);
    expect(packageSections.every((s) => s.note.includes(s.id === 'interior' ? 'Interior' : 'Exterior'))).toBe(true);
  });

  it('has a section for every add-on and combo on the menu, in menu order, and none for anything else', () => {
    const entries = addonMenu.map((m) => (m.kind === 'group' ? { id: m.group.id, name: m.group.name } : { id: m.extra.id, name: m.extra.name }));
    expect(addonSections.map((s) => s.id)).toEqual(entries.map((e) => e.id));
    for (const e of entries) expect(addonSections.find((s) => s.id === e.id)!.title).toBe(e.name);
  });

  it('lists every item of a combo by its name, so each topping the customer can pick is on the checklist', () => {
    for (const m of addonMenu) {
      if (m.kind !== 'group') continue;
      const section = addonSections.find((s) => s.id === m.group.id)!;
      for (const o of m.options) {
        expect(section.items.some((i) => i.toLowerCase().startsWith((o.short ?? o.name).toLowerCase())), `${o.name} missing from ${section.title}`).toBe(true);
      }
    }
    expect(extras.filter((e) => e.group).length).toBeGreaterThan(0);
  });

  it('puts the headliner in Stain Removal Treatment, on the checklist and in the menu text', () => {
    const stain = addonSections.find((s) => s.id === 'stain-removal')!;
    expect(stain.items.some((i) => /headliner/i.test(i))).toBe(true);
    expect(extras.find((e) => e.id === 'stain-headliner')!.blurb).toMatch(/headliner/i);
  });

  it('has no blank or repeated items inside a section', () => {
    for (const s of [...packageSections, ...addonSections]) {
      expect(s.items.length).toBeGreaterThan(0);
      expect(s.items.every((i) => i.trim().length > 3)).toBe(true);
      expect(new Set(s.items).size).toBe(s.items.length);
    }
  });
});

describe('downloadable checklist PDF', () => {
  it('is published, is a real PDF and stays small', () => {
    const bytes = readFileSync(pdfUrl);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(statSync(pdfUrl).size).toBeLessThan(1_000_000);
  });

  it('was generated from the current checklist (run `npm run checklist` after changing it)', () => {
    expect(readFileSync(hashUrl, 'utf8').trim()).toBe(checklistFingerprint());
    expect(Object.keys(checklist)).toEqual(['packageSections', 'addonSections']);
  });
});
