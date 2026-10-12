/* The Mirror Finish service checklist: one list the customer and the detailer both see, item by item.
   Wording follows what the site and the Square service descriptions promise for each package and add-on.
   The downloadable PDF (public/Mirror-Finish-Service-Checklist.pdf) is generated from this file with
   `npm run checklist`; a test fails if this file changes and the PDF was not regenerated.
   Keep this file import-free so the generator script can load it directly. */

export interface ChecklistSection { id: string; title: string; note: string; items: string[] }

/** Deluxe is the Interior detail plus the Exterior detail; the other two packages are one section each. */
export const packageSections: ChecklistSection[] = [
  {
    id: 'interior', title: 'Interior detail', note: 'Interior package · included in Deluxe',
    items: [
      'Vacuum interior carpets and seats',
      'Light upholstery clean',
      'Clean all hard surfaces and interior plastics',
      'Clean leather',
      'Condition interior plastics and leather',
      'Deep clean door and trunk jambs',
      'Natural odor reduction on interior surfaces',
    ],
  },
  {
    id: 'exterior', title: 'Exterior detail', note: 'Exterior package · included in Deluxe',
    items: [
      'Clean wheels and dress tires',
      'Hand wash with premium wax shampoo for high gloss and debris repellency',
      'Remove bumper bugs',
      'Clean and polish windows and glass',
      'Deep clean door and trunk jambs',
      'Restore exterior plastics',
      'Apply protective spray wax',
      'Hand dry with microfiber towels',
    ],
  },
];

/** One section per entry on the add-on menu, keyed by the add-on or combo id in menu.ts. A combo lists each of its items. */
export const addonSections: ChecklistSection[] = [
  {
    id: 'stain-removal', title: 'Stain Removal Treatment', note: 'Add-on · all three areas or any one',
    items: [
      'Headliner: lift stains and marks',
      'Upholstery: lift stains from seats and fabric',
      'Carpet: lift stains from carpets and floor mats',
    ],
  },
  {
    id: 'refresh-interior', title: 'Refresh Interior Treatment', note: 'Add-on · both services or either one',
    items: [
      'Steam cleaning: sanitize and refresh interior surfaces',
      'Upholstery cleaning: deep clean seats and fabric, seat by seat',
    ],
  },
  {
    id: 'pet-hair', title: 'Pet Hair Removal', note: 'Add-on',
    items: ['Remove pet hair from every nook and cranny'],
  },
  {
    id: 'decon', title: 'Paint and Glass Decontamination', note: 'Add-on',
    items: ['Lift sap, tar and grit from paint', 'Decontaminate glass', 'Paint left smooth to the touch'],
  },
  {
    id: 'headlight', title: 'Headlight Restoration', note: 'Add-on',
    items: ['Polish cloudy headlight lenses', 'Restore clarity and brightness'],
  },
];

export const checklist = { packageSections, addonSections };

/** Short fingerprint of the checklist content (FNV-1a), stored beside the PDF so a stale PDF is caught by a test. */
export function checklistFingerprint(): string {
  const text = JSON.stringify(checklist);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
