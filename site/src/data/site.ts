export const SITE = {
  name: 'Mirror Finish Mobile Detailing',
  tagline: 'Schedule an hour of TLC for your vehicle',
  description: 'Mobile car wash and auto detailing that comes to your home or workplace in Montgomery, AL and the River Region. Interior and exterior detailing, priced by vehicle size, booked online.',
  phoneDisplay: '334-652-2601',
  phoneTel: 'tel:+13346522601',
  phoneSms: 'sms:+13346522601',
  serviceArea: ['Montgomery', 'Wetumpka', 'Prattville', 'Pike Road', 'Millbrook', 'Cecil', 'Hayneville', 'White Hall'],
  region: 'AL',
  instagramUrl: 'https://www.instagram.com/mfmd_mgm/',
  /* What customers are shown. Pricing itself is unchanged; this only controls display and can be switched back on
     later. sizePrices: the per-vehicle-size prices (the size line is then shown as included in the total). */
  display: { sizePrices: false },
  schedule: { openHour: 8, closeHour: 18, closedDays: [0], stepMinutes: 60, leadDays: 1, horizonDays: 42 },
} as const;
