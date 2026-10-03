// Single source of truth for prices (cents) on the website, the booking flow and the checkout function.
// Packages and add-ons mirror the Mirror Finish Square catalog (prices and names), and carry the Square catalog
// item-variation ID so checkout orders show up in Square reports as the real services. Square charges its catalog
// price for those lines, so these numbers must match Square; checkout.test.ts guards that.
// Size charges are not in the Square catalog and go to checkout as their own lines.
export type SizeId = 'sedan' | 'small' | 'standard' | 'large';

export interface Package { id: 'deluxe' | 'exterior' | 'interior'; name: string; cents: number; minutes: number; features: string[]; badge?: string; square: string }
export interface Extra { id: string; name: string; cents: number; minutes: number; blurb: string; square: string }
export interface Size { id: SizeId; name: string; cents: number; short: string }

export const packages: Package[] = [
  { id: 'deluxe', name: 'Deluxe', cents: 20000, minutes: 120, badge: 'Most popular', square: 'FTS5EPOWPWUIMLQC5EP2UIXJ', features: ['Complete interior detail', 'Complete exterior detail'] },
  { id: 'exterior', name: 'Exterior', cents: 10000, minutes: 60, square: 'R2RWG6N5PK7ZJENI25APGMLL', features: ['Deluxe exterior detail', 'Restore exterior plastics', 'Protective spray wax'] },
  { id: 'interior', name: 'Interior', cents: 10000, minutes: 60, square: '4BKQZYOKRBMH3W5S3RHCY35C', features: ['Deluxe interior detail', 'Clean all hard surfaces', 'Vacuum and shampoo upholstery'] },
];

export const sizes: Size[] = [
  { id: 'sedan', name: 'Sedan & Coupe', short: 'Sedan / Coupe', cents: 0 },
  { id: 'small', name: 'Small SUV or Truck', short: 'Small SUV / Truck', cents: 2000 },
  { id: 'standard', name: 'Standard SUV or Truck', short: 'Standard SUV / Truck', cents: 4000 },
  { id: 'large', name: 'Van / 3-Row SUV / HD Truck', short: 'Van / 3-Row / HD', cents: 6000 },
];

export const extras: Extra[] = [
  { id: 'deep-treatment', name: 'Interior Deep Treatment', cents: 7500, minutes: 45, square: 'LGZQX44C25AZZI4CVOPMWD5T', blurb: 'Sanitize and deep clean seats, carpets and surfaces.' },
  { id: 'pet-hair', name: 'Pet Hair and Stain Removal', cents: 7500, minutes: 45, square: 'LHFNWPMKQQGMBQ6OBEQJRFNY', blurb: 'Hair and stains lifted from every nook and cranny.' },
  { id: 'decon', name: 'Paint and Glass Decontamination', cents: 4000, minutes: 30, square: 'ME7R5HV4XSEHJ4WPTUFYWXHY', blurb: 'Sap, tar and grit lifted for smooth paint and glass.' },
  { id: 'headlight', name: 'Headlight Restoration', cents: 5000, minutes: 60, square: 'F6HKSVYUHQXRUIUJWUTXJUX2', blurb: 'Clear, bright headlights again.' },
];

export const DEPOSIT_RATE = 0.2;
