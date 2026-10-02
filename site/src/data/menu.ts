// Single source of truth for prices (cents). Used by the marketing page, the booking UI and (Round 2) the Worker.
export type SizeId = 'sedan' | 'small' | 'standard' | 'large';

export interface Package { id: 'deluxe' | 'exterior' | 'interior'; name: string; cents: number; minutes: number; features: string[]; badge?: string }
export interface Extra { id: string; name: string; cents: number; minutes: number; blurb: string }
export interface Size { id: SizeId; name: string; cents: number; short: string }

export const packages: Package[] = [
  { id: 'deluxe', name: 'Deluxe', cents: 6000, minutes: 120, badge: 'Most popular', features: ['Complete interior detail', 'Complete exterior detail'] },
  { id: 'exterior', name: 'Exterior', cents: 4000, minutes: 60, features: ['Deluxe exterior detail', 'Restore exterior plastics', 'Protective spray wax'] },
  { id: 'interior', name: 'Interior', cents: 4000, minutes: 60, features: ['Deluxe interior detail', 'Clean all hard surfaces', 'Vacuum and shampoo upholstery'] },
];

export const sizes: Size[] = [
  { id: 'sedan', name: 'Sedan & Coupe', short: 'Sedan / Coupe', cents: 0 },
  { id: 'small', name: 'Small SUV or Truck', short: 'Small SUV / Truck', cents: 2000 },
  { id: 'standard', name: 'Standard SUV or Truck', short: 'Standard SUV / Truck', cents: 4000 },
  { id: 'large', name: 'Van / 3-Row SUV / HD Truck', short: 'Van / 3-Row / HD', cents: 6000 },
];

export const extras: Extra[] = [
  { id: 'shampoo-steam', name: 'Shampoo & Steam', cents: 7500, minutes: 45, blurb: 'Deep clean seats, carpets and upholstery.' },
  { id: 'deep-treatment', name: 'Interior Deep Treatment', cents: 7500, minutes: 45, blurb: 'Stain, odor and pet hair removal.' },
  { id: 'decon', name: 'Paint & Glass Decontamination', cents: 4000, minutes: 30, blurb: 'Iron removal and clay bar for smooth paint and glass.' },
  { id: 'headlight', name: 'Headlight Restoration', cents: 10000, minutes: 60, blurb: 'Clear, bright headlights again.' },
];

export const DEPOSIT_RATE = 0.2;
