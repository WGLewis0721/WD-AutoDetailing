import type { ModelKey } from './vehicles';

/* Polished driveway renders of each size-class model (public/models/<key>.webp), crossfaded on change. */
const base = (): string => {
  const u = import.meta.url;
  return u.includes('/_astro/') ? u.replace(/_astro\/[^/]*$/, '') : new URL('/', u).href;
};
const BASE = base();

export interface Still { setModel(key: ModelKey | null): void }

export function createStill(host: HTMLElement): Still {
  const layers = [0, 1].map(() => {
    const img = document.createElement('img');
    img.className = 'vstill';
    img.alt = '';
    img.decoding = 'async';
    host.appendChild(img);
    return img;
  });
  let front = 0;
  let current: ModelKey | null = null;
  return {
    setModel(key) {
      if (key === current) return;
      current = key;
      if (!key) { layers.forEach((l) => l.classList.remove('on')); return; }
      const next = layers[1 - front];
      next.onload = () => { if (current !== key) return; next.classList.add('on'); layers[front].classList.remove('on'); front = 1 - front; };
      next.src = `${BASE}models/${key}.webp`;
    },
  };
}
