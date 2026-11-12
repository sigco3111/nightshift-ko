// Quick standalone check (no test runner): node tests/check-i18n.mjs
// - every i18n key used in src/ exists in both dictionaries, no dictionary entry is unused
// - ko/en have the same keys (UI dictionary and road-sign dictionary), ko values contain Hangul
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';

const root = join(import.meta.dirname, '..');
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []; });
const files = walk(join(root, 'src')).filter((f) => !f.endsWith('i18n.ts') && !f.includes(`${join(root, 'src', 'sandbox')}`));
const source = files.map((f) => readFileSync(f, 'utf8')).join('\n');

const vite = await createServer({ root, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
const { DICT } = await vite.ssrLoadModule('/src/i18n.ts');
const { SIGN_DICT, HANGUL_RE } = await vite.ssrLoadModule('/src/world/signtext.ts');
await vite.close();

const errors = [];
const used = new Set();
for (const m of source.matchAll(/\b(?:t|tr|tn)\(\s*['`]([a-z][\w.]*)['`]/g)) used.add(m[1]);
for (const m of source.matchAll(/\bta\([^,]+,\s*'[\w-]+',\s*'([\w.]+)'/g)) used.add(m[1]);
for (const m of source.matchAll(/'((?:set|menu|pause|ctl|hud|hint|go|nav|load|intro|popup|bonus|banner|cause|doc)\.[A-Za-z.]+)'/g)) used.add(m[1]);
for (const k of used) for (const l of ['en', 'ko']) if (!(k in DICT[l])) errors.push(`UI key "${k}" missing in ${l}`);
for (const k of Object.keys(DICT.en)) if (!(k in DICT.ko)) errors.push(`UI key "${k}" missing in ko`);
for (const k of Object.keys(DICT.ko)) if (!(k in DICT.en)) errors.push(`UI key "${k}" missing in en`);
for (const k of Object.keys(DICT.ko)) if (!HANGUL_RE.test(DICT.ko[k])) errors.push(`UI ko "${k}" has no Hangul`);
for (const k of Object.keys(SIGN_DICT.en)) if (!(k in SIGN_DICT.ko)) errors.push(`sign key "${k}" missing in ko`);
for (const k of Object.keys(SIGN_DICT.ko)) if (!(k in SIGN_DICT.en)) errors.push(`sign key "${k}" missing in en`);
// every sign key is used by a painter
const usedSign = source + '\n' + readFileSync(join(root, 'src/world/backdrop/signs.ts'), 'utf8');
for (const k of Object.keys(SIGN_DICT.en)) {
  const direct = usedSign.includes(`'${k}'`);
  const word = k.startsWith('word.') && usedSign.includes("`word.${id}`");
  if (!direct && !word) errors.push(`sign key "${k}" is never used`);
}
console.log(`UI keys: ${Object.keys(DICT.en).length} (used in source: ${used.size}); sign texts: ${Object.keys(SIGN_DICT.en).length}`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('i18n check OK');
