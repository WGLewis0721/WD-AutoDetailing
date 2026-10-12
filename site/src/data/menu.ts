// Single source of truth for prices (cents) on the website, the booking flow and the checkout function.
// Packages and add-ons mirror the Mirror Finish Square catalog (prices and names), and carry the Square catalog
// item-variation ID so checkout orders show up in Square reports as the real services. Square charges its catalog
// price for those lines, so these numbers must match Square; checkout.test.ts guards that.
// Size charges, and the stain removal and refresh add-ons (new, not yet in the catalog), go to checkout as their own lines.
export type SizeId = 'sedan' | 'small' | 'standard' | 'large';

export interface Package { id: 'deluxe' | 'exterior' | 'interior'; name: string; cents: number; minutes: number; features: string[]; badge?: string; square: string }
/** A single add-on item. `square` is the Square catalog variation ID when the item exists in the catalog; items without one
 * (the stain removal and refresh options) go to checkout as their own priced lines. `group` ties an item to a combo. */
export interface Extra { id: string; name: string; short?: string; cents: number; minutes: number; blurb: string; square?: string; group?: string }
/** A combo of add-on items, like a pizza: customers take the whole combo at its own price or pick the items one by one.
 * Choosing every item is the combo. `cents` is the combo price; the items' own prices add up to more. */
export interface AddonGroup { id: string; name: string; cents: number; blurb: string; optionIds: string[] }
export interface Size { id: SizeId; name: string; cents: number; short: string }

export const packages: Package[] = [
  { id: 'deluxe', name: 'Deluxe', cents: 7500, minutes: 120, badge: 'Most popular', square: 'FTS5EPOWPWUIMLQC5EP2UIXJ', features: ['Complete interior detail', 'Complete exterior detail'] },
  { id: 'exterior', name: 'Exterior', cents: 5000, minutes: 60, square: 'R2RWG6N5PK7ZJENI25APGMLL', features: ['Deluxe exterior detail', 'Restore exterior plastics', 'Protective spray wax'] },
  { id: 'interior', name: 'Interior', cents: 5000, minutes: 60, square: '4BKQZYOKRBMH3W5S3RHCY35C', features: ['Deluxe interior detail', 'Clean all hard surfaces', 'Vacuum and light upholstery clean'] },
];

export const sizes: Size[] = [
  { id: 'sedan', name: 'Sedan & Coupe', short: 'Sedan / Coupe', cents: 0 },
  { id: 'small', name: 'Small SUV or Truck', short: 'Small SUV / Truck', cents: 2000 },
  { id: 'standard', name: 'Standard SUV or Truck', short: 'Standard SUV / Truck', cents: 4000 },
  { id: 'large', name: 'Van / 3-Row SUV / HD Truck', short: 'Van / 3-Row / HD', cents: 6000 },
];

export const extras: Extra[] = [
  { id: 'stain-headliner', group: 'stain-removal', name: 'Headliner Stain Removal', short: 'Headliner', cents: 3500, minutes: 20, blurb: 'Stains and marks lifted from the headliner.' },
  { id: 'stain-upholstery', group: 'stain-removal', name: 'Upholstery Stain Removal', short: 'Upholstery', cents: 4500, minutes: 30, blurb: 'Stains lifted from seats and fabric.' },
  { id: 'stain-carpet', group: 'stain-removal', name: 'Carpet Stain Removal', short: 'Carpet', cents: 4000, minutes: 25, blurb: 'Stains lifted from carpets and floor mats.' },
  { id: 'refresh-steam', group: 'refresh-interior', name: 'Steam Cleaning', short: 'Steam cleaning', cents: 5000, minutes: 30, blurb: 'Steam cleaning to sanitize and refresh interior surfaces.' },
  { id: 'refresh-upholstery', group: 'refresh-interior', name: 'Upholstery Cleaning', short: 'Upholstery cleaning', cents: 4500, minutes: 30, blurb: 'Deep upholstery cleaning, seat by seat.' },
  { id: 'pet-hair', name: 'Pet Hair Removal', cents: 7500, minutes: 45, square: 'LHFNWPMKQQGMBQ6OBEQJRFNY', blurb: 'Pet hair lifted from every nook and cranny.' },
  { id: 'decon', name: 'Paint and Glass Decontamination', cents: 4000, minutes: 30, square: 'ME7R5HV4XSEHJ4WPTUFYWXHY', blurb: 'Sap, tar and grit lifted for smooth paint and glass.' },
  { id: 'headlight', name: 'Headlight Restoration', cents: 5000, minutes: 60, square: 'F6HKSVYUHQXRUIUJWUTXJUX2', blurb: 'Clear, bright headlights again.' },
];

export const addonGroups: AddonGroup[] = [
  { id: 'stain-removal', name: 'Stain Removal Treatment', cents: 10000, optionIds: ['stain-headliner', 'stain-upholstery', 'stain-carpet'],
    blurb: 'Stains lifted from the headliner, upholstery and carpet. Take all three areas, or just the ones you need.' },
  { id: 'refresh-interior', name: 'Refresh Interior Treatment', cents: 8000, optionIds: ['refresh-steam', 'refresh-upholstery'],
    blurb: 'Steam cleaning and upholstery cleaning to sanitize and refresh the cabin. Take both, or either one.' },
];

/** The old "Interior Deep Treatment" add-on, replaced by the two treatments above. It is no longer on the menu. A browser that
 * loaded the site before the change can still submit it for a short while, so the server keeps pricing it exactly as the
 * customer saw it. Remove this (and its tests) after 2026-10-26. */
export const legacyExtras: Extra[] = [
  { id: 'deep-treatment', name: 'Interior Deep Treatment', cents: 7500, minutes: 45, square: 'LGZQX44C25AZZI4CVOPMWD5T', blurb: 'Sanitize and deep clean seats, carpets, surfaces and the headliner.' },
];

/** Any add-on id the server will accept: the menu plus the retired ones. */
export const findExtra = (id: string): Extra | undefined => extras.find((x) => x.id === id) ?? legacyExtras.find((x) => x.id === id);
export const optionsOf = (g: AddonGroup): Extra[] => g.optionIds.map((id) => extras.find((x) => x.id === id)!);
/** What choosing every item separately would cost minus the combo price. */
export const groupSavings = (g: AddonGroup): number => optionsOf(g).reduce((n, o) => n + o.cents, 0) - g.cents;

export type AddonEntry = { kind: 'group'; group: AddonGroup; options: Extra[] } | { kind: 'single'; extra: Extra };
/** The add-on menu in display order: each combo once, where its first item sits, then the single add-ons. */
export const addonMenu: AddonEntry[] = (() => {
  const out: AddonEntry[] = [];
  for (const e of extras) {
    const g = addonGroups.find((x) => x.id === e.group);
    if (!g) out.push({ kind: 'single', extra: e });
    else if (!out.some((x) => x.kind === 'group' && x.group.id === g.id)) out.push({ kind: 'group', group: g, options: optionsOf(g) });
  }
  return out;
})();

export const DEPOSIT_RATE = 0.2;
