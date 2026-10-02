export interface Row { name: string; price: string; note?: string }

export const packages = [
  { name: 'Deluxe', price: '$60', blurb: 'Interior and exterior together, the full detail.' },
  { name: 'Exterior', price: '$40', blurb: 'Exterior-only detail for a mirror shine.' },
  { name: 'Interior', price: '$40', blurb: 'Interior-only detail for a fresh cabin.' },
] as const;

export const sizes: Row[] = [
  { name: 'Sedan / Coupe', price: '+$0' },
  { name: 'Hatchback / Crossover / Small SUV / Truck', price: '+$20' },
  { name: 'Standard SUV / Truck', price: '+$40' },
  { name: 'Minivan / Van', price: '+$60' },
];

export const extras: Row[] = [
  { name: 'Paint & Glass Cleanse', price: '$40' },
  { name: 'Pet Hair & Stain Removal', price: '$50' },
  { name: 'Bodily Fluid Cleanup', price: '$40' },
  { name: 'Headlight Restoration', price: '$50', note: 'about 1 hour' },
  { name: '6-Point Inspection', price: '$20' },
  { name: 'Steam Upholstery', price: '$10' },
  { name: 'Spot Stain Treatment', price: '$10' },
  { name: 'Clear Coat Restoration', price: 'Price on request' },
];
