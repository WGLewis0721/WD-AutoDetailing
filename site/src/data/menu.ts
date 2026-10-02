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
  { name: 'Paint & Glass Cleanse', price: '$40' },
  { name: 'Pet Hair & Stain Removal', price: '$50' },
  { name: 'Bodily Fluid Cleanup', price: '$40' },
  { name: 'Headlight Restoration', price: '$50', note: 'about 1 hour' },
  { name: '6-Point Inspection', price: '$20' },
  { name: 'Steam Upholstery', price: '$10' },
  { name: 'Spot Stain Treatment', price: '$10' },
  { name: 'Clear Coat Restoration', price: 'Price on request' },
];
