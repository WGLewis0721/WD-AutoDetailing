// Copies dist/ to a folder whose pages use relative URLs, so the site works from any sub-path
// (used for shareable previews that are not served from a domain root).
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const out = process.argv[2] ?? 'dist-relative';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync('dist', out, { recursive: true });

const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const file of walk(out).filter((f) => f.endsWith('.html'))) {
  const depth = relative(out, file).split(sep).length - 1;
  const up = depth ? '../'.repeat(depth) : './';
  let html = readFileSync(file, 'utf8');
  html = html
    .replace(/(href|src|srcset|data-pass-art|poster)="\/(_astro\/|favicon|robots|sitemap)/g, `$1="${up}$2`)
    .replace(/(\s)\/_astro\//g, `$1${up}_astro/`)
    .replace(/href="\/book(\/?)(\?[^"]*)?"/g, (_, __, q = '') => `href="${up}book/index.html${q}"`)
    .replace(/href="\/#/g, `href="${up}index.html#`)
    .replace(/href="\/"/g, `href="${up}index.html"`)
    .replace('data-book="/book"', `data-book="${up}book/index.html"`)
    .replace('data-home="/"', `data-home="${up}index.html"`);
  writeFileSync(file, html);
}
for (const file of walk(out).filter((f) => f.endsWith('.css'))) {
  const css = readFileSync(file, 'utf8').replace(/url\((["']?)\/_astro\//g, 'url($1./');
  writeFileSync(file, css);
}
console.log('relative copy written to', out);
