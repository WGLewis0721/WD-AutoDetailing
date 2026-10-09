import type { ModelKey } from './vehicles';

/* Size-class vehicles on one shared driveway. The driveway plate (public/models/plate[@2x].webp) is a fixed
   layer; each vehicle is a cut-out with its shadow (public/models/<key>-car[@2x].webp), aligned to that plate.
   Switching never double-exposes two cars: the current car eases out, the next one (already loaded and
   decoded) eases in a beat later, and the house, trees and light never move. */
const base = (): string => {
  const u = import.meta.url;
  return u.includes('/_astro/') ? u.replace(/_astro\/[^/]*$/, '') : new URL('/', u).href;
};
const BASE = base();
/** Site-owned transparent vehicle render, also used in the branded request receipt. */
export const vehicleStillUrl = (key: ModelKey): string => `${BASE}models/${key}-car.webp`;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IN_DELAY_MS = 150, CLEAN_MS = 700; // old car is mostly gone (CSS: .2s) before the next one starts

export interface Still { setModel(key: ModelKey | null): void; preload(keys: ModelKey[]): void }

export function createStill(host: HTMLElement): Still {
  const hi = () => host.clientWidth * (window.devicePixelRatio || 1) > 1300 ? '@2x' : '';
  const url = (k: ModelKey) => `${BASE}models/${k}-car${hi()}.webp`;
  const cache = new Map<string, Promise<void>>();
  const load = (src: string) => {
    if (!cache.has(src)) {
      cache.set(src, new Promise<void>((res) => {
        const i = new Image();
        i.decoding = 'async';
        i.onload = () => { (i.decode ? i.decode() : Promise.resolve()).catch(() => undefined).then(() => res()); };
        i.onerror = () => res();
        i.src = src;
      }));
    }
    return cache.get(src)!;
  };

  // The plate sits under every car; the stage's CSS background is the same picture until it has loaded.
  const plateSrc = `${BASE}models/plate${hi()}.webp`;
  if (!host.querySelector('.vplate')) {
    const plate = document.createElement('img');
    plate.className = 'vplate';
    plate.alt = '';
    plate.decoding = 'async';
    plate.src = plateSrc;
    host.prepend(plate);
  }

  let want: ModelKey | null = (host.querySelector<HTMLElement>('.vstill.on')?.dataset.model as ModelKey) ?? null;
  return {
    async setModel(key) {
      /* No vehicle (e.g. the make was just changed): keep the last car on screen rather than emptying the drive. */
      if (!key || key === want) return;
      want = key;
      const src = url(key);
      await load(src);
      if (want !== key) return;
      const img = document.createElement('img');
      img.className = 'vstill';
      img.alt = '';
      img.dataset.model = key;
      img.src = src;
      const old = [...host.querySelectorAll<HTMLElement>('.vstill')];
      host.appendChild(img);
      const clear = () => old.forEach((n) => n.remove());
      if (reduced()) { img.classList.add('on'); clear(); return; }
      old.forEach((n) => { n.classList.remove('on'); n.classList.add('off'); });
      setTimeout(() => requestAnimationFrame(() => img.classList.add('on')), old.length ? IN_DELAY_MS : 0);
      setTimeout(clear, CLEAN_MS);
    },
    preload(keys) { keys.forEach((k) => { void load(url(k)); }); },
  };
}
