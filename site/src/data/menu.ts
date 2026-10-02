export interface Row { name: string; price: string; note?: string }

export const packages = [
  { name: 'Deluxe', price: '$60', features: ['Complete interior detail', 'Complete exterior detail'] },
  { name: 'Exterior', price: '$40', features: ['Deluxe exterior detail', 'Restore exterior plastics', 'Protective spray wax'] },
  { name: 'Interior', price: '$40', features: ['Deluxe interior detail', 'Clean all hard surfaces', 'Vacuum and shampoo upholstery'] },
] as const;

export const sizes: Row[] = [
  { name: 'Sedan & Coupe', price: '+$0' },
  { name: 'Small SUV or Truck', price: '+$20' },
  { name: 'Standard SUV or Truck', price: '+$40' },
  { name: 'Van / 3-Row SUV / HD Truck', price: '+$60' },
];

export const extras: Row[] = [
  { name: 'Shampoo & Steam', price: '$75', note: 'deep clean seats, carpets and upholstery' },
  { name: 'Interior Deep Treatment', price: '$75', note: 'stain, odor and pet hair removal' },
  { name: 'Paint & Glass Decontamination', price: '$40', note: 'iron removal and clay bar' },
  { name: 'Headlight Restoration', price: '$100' },
];
