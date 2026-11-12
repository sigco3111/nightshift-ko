/**
 * i18n dictionary checks (한글화): ko/en have identical keys and placeholders, every key used in the
 * source exists, and no dictionary entry is dead. Pure Node, no DOM needed.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DICT } from '../src/i18n';

const SRC = join(import.meta.dirname, '..', 'src');
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}
const files = walk(SRC).filter((f) => !f.endsWith('i18n.ts') && !f.includes(`${join(SRC, 'sandbox')}`));
const source = files.map((f) => readFileSync(f, 'utf8')).join('\n');

const enKeys = Object.keys(DICT.en).sort();
const koKeys = Object.keys(DICT.ko).sort();
const ph = (s: string): string[] => (s.match(/\{\w+\}/g) ?? []).sort();

describe('i18n dictionaries', () => {
  it('ko and en define the same keys', () => {
    expect(koKeys).toEqual(enKeys);
  });
  it('no empty values, same placeholders in both languages', () => {
    for (const k of enKeys) {
      const e = (DICT.en as Record<string, string>)[k]!;
      const o = (DICT.ko as Record<string, string>)[k]!;
      expect(e.length, `en ${k}`).toBeGreaterThan(0);
      expect(o.length, `ko ${k}`).toBeGreaterThan(0);
      expect(ph(o), `placeholders ${k}`).toEqual(ph(e));
    }
  });
  it('every ko value contains Hangul', () => {
    for (const k of koKeys) expect((DICT.ko as Record<string, string>)[k], k).toMatch(/[\u3131-\u318e\uac00-\ud7a3]/);
  });
  it('every key used in the source exists in both dictionaries', () => {
    const used = new Set<string>();
    for (const m of source.matchAll(/\b(?:t|tr|tn)\(\s*['`]([a-z][\w.]*)['`]/g)) used.add(m[1]!);
    for (const m of source.matchAll(/\bta\([^,]+,\s*'[\w-]+',\s*'([\w.]+)'/g)) used.add(m[1]!);
    for (const m of source.matchAll(/'((?:set|menu|pause|ctl|hud|hint|go|nav|load|intro|popup|bonus|banner|cause|doc)\.[A-Za-z.]+)'/g)) used.add(m[1]!);
    expect(used.size).toBeGreaterThan(60);
    for (const k of used) {
      expect(DICT.en, `en missing ${k}`).toHaveProperty([k]);
      expect(DICT.ko, `ko missing ${k}`).toHaveProperty([k]);
    }
  });
  it('dynamic key families are complete', () => {
    for (const w of ['truck', 'van', 'traffic']) for (const p of ['cause.rear.', 'cause.hit.']) expect(DICT.ko).toHaveProperty([p + w]);
    for (const q of ['low', 'medium', 'high', 'ultra']) expect(DICT.ko).toHaveProperty(['set.q.' + q]);
  });
  it('no dictionary key is unused in the source', () => {
    const dyn = /^(doc\.|cause\.(rear|hit)\.|set\.q\.)/;
    const dead = enKeys.filter((k) => !dyn.test(k) && !source.includes(`'${k}'`) && !source.includes(`\`${k}\``));
    expect(dead).toEqual([]);
  });
});
