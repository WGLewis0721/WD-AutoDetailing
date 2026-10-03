import type { ModelKey } from './vehicles';

/* Polished driveway renders of each size-class vehicle (public/models/<key>.webp and <key>@2x.webp).
   Crossfade without flicker: the current picture stays fully opaque underneath until the next one has
   loaded and decoded, then the next one fades in on top and the old one is removed. */
const base = (): string => {
  const u = import.meta.url;
  return u.includes('/_astro/') ? u.replace(/_astro\/[^/]*$/, '') : new URL('/', u).href;
};
const BASE = base();
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface Still { setModel(key: ModelKey | null): void; preload(keys: ModelKey[]): void }

export function createStill(host: HTMLElement): Still {
  const url = (k: ModelKey) => `${BASE}models/${k}${host.clientWidth * (window.devicePixelRatio || 1) > 1300 ? '@2x' : ''}.webp`;
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
  let want: ModelKey | null = null;
  return {
    async setModel(key) {
      if (key === want) return;
      want = key;
      if (!key) { host.querySelectorAll('.vstill').forEach((n) => n.remove()); return; }
      const src = url(key);
      await load(src);
      if (want !== key) return;
      const img = document.createElement('img');
      img.className = 'vstill';
      img.alt = '';
      img.src = src;
      host.appendChild(img);
      const done = () => host.querySelectorAll('.vstill').forEach((n) => { if (n !== img) n.remove(); });
      if (reduced()) { img.classList.add('on'); done(); return; }
      requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add('on')));
      img.addEventListener('transitionend', done, { once: true });
      setTimeout(done, 900);
    },
    preload(keys) { keys.forEach((k) => { void load(url(k)); }); },
  };
}
