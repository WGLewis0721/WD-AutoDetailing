// Fails if any colour is hard-coded outside src/styles/tokens.css (keeps the 60/30/10 system consistent).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const bad = [];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(css|astro|ts)$/.test(f) || p.endsWith('tokens.css') || p.endsWith('.test.ts')) continue;
    readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
      if (line.includes('theme-color')) return;
      if (/(^|[^&\w])#[0-9a-fA-F]{3,8}\b/.test(line) || /\brgba?\(/.test(line) || /\bhsla?\(/.test(line)) bad.push(`${p}:${i + 1}: ${line.trim()}`);
    });
  }
};
walk('src');
if (bad.length) { console.error('Hard-coded colours found (use tokens.css):\n' + bad.join('\n')); process.exit(1); }
console.log('token check passed');
