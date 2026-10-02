import type { SizeId } from '../data/menu';

export type Shape = 'sedan' | 'coupe' | 'hatch' | 'suv' | 'truck' | 'van';
export interface Model { name: string; shape: Shape; size: SizeId }

/* Codes: S sedan, C coupe/sports, H hatchback, c compact SUV/crossover, U SUV, L 3-row SUV, P pickup, p small pickup, D heavy-duty pickup, M minivan, V full van. */
const CODE: Record<string, { shape: Shape; size: SizeId }> = {
  S: { shape: 'sedan', size: 'sedan' }, C: { shape: 'coupe', size: 'sedan' }, H: { shape: 'hatch', size: 'small' },
  c: { shape: 'suv', size: 'small' }, U: { shape: 'suv', size: 'standard' }, L: { shape: 'suv', size: 'large' },
  P: { shape: 'truck', size: 'standard' }, p: { shape: 'truck', size: 'small' }, D: { shape: 'truck', size: 'large' },
  M: { shape: 'van', size: 'large' }, V: { shape: 'van', size: 'large' },
};

const RAW: Record<string, string> = {
  Acura: 'ILX:S,Integra:H,TLX:S,RDX:c,MDX:L,RSX:C',
  'Alfa Romeo': 'Giulia:S,Stelvio:c,Tonale:c',
  Audi: 'A3:S,A4:S,A5:C,A6:S,A7:S,A8:S,Q3:c,Q5:c,Q7:L,Q8:U,TT:C,e-tron:U',
  BMW: '2 Series:C,3 Series:S,4 Series:C,5 Series:S,7 Series:S,X1:c,X3:c,X4:U,X5:U,X6:U,X7:L,Z4:C',
  Buick: 'Encore:c,Envision:U,Enclave:L,Regal:S,LaCrosse:S',
  Cadillac: 'ATS:S,CT4:S,CT5:S,XT4:c,XT5:U,XT6:L,Escalade:L',
  Chevrolet: 'Spark:H,Malibu:S,Impala:S,Cruze:S,Camaro:C,Corvette:C,Trax:c,Equinox:c,Blazer:U,Traverse:L,Tahoe:L,Suburban:L,Colorado:p,Silverado 1500:P,Silverado 2500HD:D,Express:V',
  Chrysler: '200:S,300:S,Pacifica:M',
  Dodge: 'Charger:S,Challenger:C,Dart:S,Journey:U,Durango:L,Grand Caravan:M,Ram 1500:P',
  Ford: 'Fiesta:H,Focus:H,Fusion:S,Mustang:C,Escape:c,Bronco Sport:c,Edge:U,Explorer:L,Expedition:L,Bronco:U,Maverick:p,Ranger:p,F-150:P,F-250:D,F-350:D,Transit:V',
  GMC: 'Terrain:c,Acadia:L,Yukon:L,Sierra 1500:P,Sierra 2500HD:D,Canyon:p,Savana:V',
  Genesis: 'G70:S,G80:S,G90:S,GV70:c,GV80:U',
  Honda: 'Fit:H,Civic:S,Accord:S,Insight:S,HR-V:c,CR-V:c,Passport:U,Pilot:L,Odyssey:M,Ridgeline:P',
  Hyundai: 'Accent:S,Elantra:S,Sonata:S,Veloster:H,Kona:c,Tucson:c,Santa Fe:U,Palisade:L,Santa Cruz:p',
  Infiniti: 'Q50:S,Q60:C,QX50:c,QX60:L,QX80:L',
  Jaguar: 'XE:S,XF:S,F-Type:C,E-Pace:c,F-Pace:U',
  Jeep: 'Renegade:c,Compass:c,Cherokee:U,Grand Cherokee:U,Wrangler:U,Gladiator:P,Wagoneer:L',
  Kia: 'Rio:S,Forte:S,K5:S,Optima:S,Stinger:S,Soul:H,Seltos:c,Sportage:c,Sorento:U,Telluride:L,Carnival:M',
  'Land Rover': 'Range Rover Evoque:c,Discovery Sport:c,Range Rover Sport:U,Range Rover:L,Defender:U,Discovery:L',
  Lexus: 'IS:S,ES:S,GS:S,LS:S,RC:C,UX:c,NX:c,RX:U,GX:L,LX:L',
  Lincoln: 'MKZ:S,Corsair:c,Nautilus:U,Aviator:L,Navigator:L',
  Mazda: 'Mazda3:S,Mazda6:S,MX-5 Miata:C,CX-3:c,CX-30:c,CX-5:c,CX-50:c,CX-9:L',
  'Mercedes-Benz': 'A-Class:S,C-Class:S,E-Class:S,S-Class:S,CLA:S,GLA:c,GLB:c,GLC:U,GLE:U,GLS:L,G-Class:U,Sprinter:V',
  Mini: 'Cooper:H,Clubman:H,Countryman:c',
  Mitsubishi: 'Mirage:H,Lancer:S,Outlander Sport:c,Eclipse Cross:c,Outlander:U',
  Nissan: 'Versa:S,Sentra:S,Altima:S,Maxima:S,370Z:C,GT-R:C,Kicks:c,Rogue:c,Murano:U,Pathfinder:L,Armada:L,Frontier:p,Titan:P,NV Cargo:V',
  Porsche: '911:C,718 Cayman:C,Panamera:S,Macan:c,Cayenne:U,Taycan:S',
  Ram: '1500:P,2500:D,3500:D,ProMaster:V',
  Subaru: 'Impreza:S,Legacy:S,WRX:S,BRZ:C,Crosstrek:c,Forester:c,Outback:U,Ascent:L',
  Tesla: 'Model 3:S,Model S:S,Model Y:c,Model X:U,Cybertruck:P',
  Toyota: 'Yaris:H,Corolla:S,Camry:S,Avalon:S,Prius:H,86:C,GR Supra:C,C-HR:c,RAV4:c,Venza:U,Highlander:L,4Runner:U,Sequoia:L,Land Cruiser:L,Tacoma:p,Tundra:P,Sienna:M',
  Volkswagen: 'Jetta:S,Passat:S,Golf:H,GTI:H,Beetle:C,Tiguan:c,Atlas:L,Taos:c,ID.4:c',
  Volvo: 'S60:S,S90:S,V60:S,XC40:c,XC60:U,XC90:L',
};

export const makes: string[] = Object.keys(RAW).sort();

export function modelsFor(make: string): Model[] {
  const raw = RAW[make];
  if (!raw) return [];
  return raw.split(',').map((pair) => {
    const i = pair.lastIndexOf(':');
    const code = CODE[pair.slice(i + 1)];
    return { name: pair.slice(0, i), shape: code.shape, size: code.size };
  });
}

export const years: number[] = Array.from({ length: 2027 - 1999 }, (_, i) => 2027 - i);

/** Fallback when a vehicle is not listed: customer picks a body style. */
export const bodyStyles: { id: string; label: string; shape: Shape; size: SizeId }[] = [
  { id: 'sedan', label: 'Sedan', shape: 'sedan', size: 'sedan' },
  { id: 'coupe', label: 'Coupe', shape: 'coupe', size: 'sedan' },
  { id: 'hatch', label: 'Hatchback', shape: 'hatch', size: 'small' },
  { id: 'compact-suv', label: 'Small SUV / Crossover', shape: 'suv', size: 'small' },
  { id: 'suv', label: 'Standard SUV', shape: 'suv', size: 'standard' },
  { id: 'three-row', label: '3-Row SUV', shape: 'suv', size: 'large' },
  { id: 'small-truck', label: 'Small Truck', shape: 'truck', size: 'small' },
  { id: 'truck', label: 'Standard Truck', shape: 'truck', size: 'standard' },
  { id: 'hd-truck', label: 'HD Truck', shape: 'truck', size: 'large' },
  { id: 'van', label: 'Van / Minivan', shape: 'van', size: 'large' },
];
