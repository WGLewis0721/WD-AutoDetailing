const P: Record<string, string> = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  car: '<path d="M4 16v-3l2-5a2 2 0 012-1.4h8A2 2 0 0118 8l2 5v3M4 16h16M4 16v2h3v-2M17 16v2h3v-2"/><circle cx="8" cy="13" r=".6"/><circle cx="16" cy="13" r=".6"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  droplet: '<path d="M12 3s6 6.2 6 10.5A6 6 0 016 13.5C6 9.2 12 3 12 3z"/>',
  wand: '<path d="M4 20L16 8M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 12l.7 1.3 1.3.7-1.3.7-.7 1.3-.7-1.3-1.3-.7 1.3-.7z"/>',
  home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9h18v3H3zM12 9v11M12 9c-3 0-4-4-1.5-4S12 9 12 9zm0 0c3 0 4-4 1.5-4S12 9 12 9z"/>',
};
export const icon = (name: string, size = 20): string =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] ?? ''}</svg>`;

/** Side-view silhouettes for the four size classes. */
export const SILHOUETTE: Record<string, string> = {
  sedan: '<path d="M6 36v-5c0-3 2-4.5 6-5l16-3 10-11c1.5-1.5 3-2 5-2h22c3 0 5 1 7 3l10 11 14 3c4 1 6 2.5 6 6v5" /><path d="M43 12l-9 11h50l-9-11z"/>',
  small: '<path d="M6 36v-6c0-3 1.5-4.5 5-5l8-2 7-12c1-1.5 2.5-2.5 5-2.5h46c3 0 5 1 6.5 3l8 11 11 3c3.5 1 5 2.5 5 6v6"/><path d="M33 11l-6 12h60l-8-12z"/>',
  standard: '<path d="M6 38v-8c0-3 1.5-4.5 5-5l7-2 6-12c1-1.5 3-2.5 5-2.5h52c3 0 5 1 7 3l7 11 12 4c3 1 4 2.5 4 6v8"/><path d="M30 11l-5 12h68l-9-12z"/>',
  large: '<path d="M6 38v-6c0-3 1.5-4.5 5-5l5-1.5V12c0-3 2-5 5-5h74c3 0 5 1.5 7 4l9 13 4 3c3 1 4 2.5 4 6v8"/><path d="M22 11v14h72L84 11z"/>',
};
export const silhouette = (id: string, w = 120): string =>
  `<svg class="sil" width="${w}" viewBox="0 0 130 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SILHOUETTE[id] ?? ''}<circle cx="32" cy="38" r="6.5"/><circle cx="102" cy="38" r="6.5"/></svg>`;
