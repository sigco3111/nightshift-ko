/**
 * Road-sign texts (한글화): ko/en sign dictionaries match, Hangul font stack is present, and every text the
 * three canvas painters draw (gantry/VMS/verge atlas, backdrop words, tunnel/bridge atlas) fits the room it
 * is given in both languages. No DOM/WebGL: a recording mock canvas with a rough per-glyph width model
 * (Hangul 1 em, Latin caps 0.7 em - wider than Arial Narrow, so the check is conservative).
 */
import { describe, expect, it } from 'vitest';
import { HANGUL_RE, HANGUL_STACK, SIGN_DICT, SIGN_FONT, SIGN_FONT_NARROW } from '../src/world/signtext';

const INVARIANT = new Set(['sign.km', 'sign.sos']);
/** Distances: ko uses metric units instead of miles, so only digits + unit. */
const METRIC = new Set(['sign.halfMile', 'sign.oneMile']);

describe('sign dictionaries', () => {
  const enKeys = Object.keys(SIGN_DICT.en).sort();
  it('ko and en define the same keys, no empty values', () => {
    expect(Object.keys(SIGN_DICT.ko).sort()).toEqual(enKeys);
    for (const k of enKeys) {
      expect((SIGN_DICT.en as Record<string, string>)[k]!.length, k).toBeGreaterThan(0);
      expect((SIGN_DICT.ko as Record<string, string>)[k]!.length, k).toBeGreaterThan(0);
    }
  });
  it('ko is translated (Hangul) except the invariant codes', () => {
    for (const k of enKeys) {
      const v = (SIGN_DICT.ko as Record<string, string>)[k]!;
      if (INVARIANT.has(k)) expect(v, k).toBe((SIGN_DICT.en as Record<string, string>)[k]);
      else if (METRIC.has(k)) expect(v, k).toMatch(/^[\d.]+ (m|km)$/);
      else expect(HANGUL_RE.test(v), `${k}: ${v}`).toBe(true);
    }
  });
  it('font stacks keep the Latin face first and list the Hangul system fonts', () => {
    for (const f of [SIGN_FONT, SIGN_FONT_NARROW]) {
      expect(f.indexOf('Arial')).toBeLessThan(f.indexOf('Pretendard'));
      for (const n of ['Pretendard', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic']) expect(f).toContain(n);
      expect(f.endsWith('sans-serif')).toBe(true);
    }
    expect(HANGUL_STACK).toContain('"Malgun Gothic"');
  });
});

interface Rec {
  ctx: number;
  s: string;
  px: number;
  reqPx: number;
  maxW: number | undefined;
  w: number;
}

function glyphW(ch: string): number {
  if (HANGUL_RE.test(ch)) return 1;
  if (ch === ' ') return 0.28;
  if (/[A-Z]/.test(ch)) return 0.7;
  if (/[a-z0-9]/.test(ch)) return 0.56;
  return 0.5;
}

function mockContext(id: number, size: [number, number], recs: Rec[]): unknown {
  let font = '';
  let spacing = '0px';
  const sets: number[] = [];
  const pxOf = (f: string) => Number(/(\d+(?:\.\d+)?)px/.exec(f)?.[1] ?? 10);
  const width = (s: string) => [...s].reduce((a, ch) => a + glyphW(ch) * pxOf(font) + parseFloat(spacing), 0);
  const state: Record<string, unknown> = {
    canvas: { width: size[0], height: size[1] },
    measureText: (s: string) => ({ width: width(s) }),
    fillText: (s: string, _x: number, _y: number, maxW?: number) => {
      recs.push({ ctx: id, s, px: pxOf(font), reqPx: sets[0] ?? pxOf(font), maxW, w: width(s) });
      sets.length = 0;
    },
    createLinearGradient: () => ({ addColorStop() {} }),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  };
  return new Proxy(state, {
    get: (t, k: string) => (k in t ? t[k] : k === 'font' ? font : k === 'letterSpacing' ? spacing : () => undefined),
    set: (t, k: string, v) => {
      if (k === 'font') {
        font = v as string;
        sets.push(pxOf(font));
      } else if (k === 'letterSpacing') spacing = v as string;
      else t[k] = v;
      return true;
    },
  });
}

describe('canvas sign painters (mock canvas)', () => {
  it('every drawn text fits its room in ko and en, and repaints on language switch', async () => {
    const recs: Rec[] = [];
    let n = 0;
    const g = globalThis as Record<string, unknown>;
    g.document = {
      documentElement: {},
      title: '',
      querySelector: () => null,
      getElementById: () => null,
      createElement: () => {
        const id = ++n;
        const cv: Record<string, unknown> = { width: 0, height: 0 };
        cv.getContext = () => mockContext(id, [1024, 1024], recs);
        return cv;
      },
    };
    const i18n = await import('../src/i18n');
    const furniture = await import('../src/world/features/furniture/signAtlas');
    const backdrop = await import('../src/world/backdrop/signs');
    const structures = await import('../src/world/features/structures/materials');
    i18n.setLang('ko');
    furniture.getSignAtlas();
    backdrop.signAtlas();
    structures.signAtlas();
    const ko = recs.splice(0);
    i18n.setLang('en'); // listeners repaint every atlas in place
    const en = recs.splice(0);
    i18n.setLang('ko');
    const ko2 = recs.splice(0);
    delete g.document;

    expect(ko.length).toBe(ko2.length);
    expect(en.length).toBe(ko.length);
    expect(ko.length).toBeGreaterThan(60);
    let worst = 1;
    for (const [lang, list] of [['ko', ko], ['en', en]] as const) {
      for (const r of list) {
        if (r.maxW === undefined) continue;
        expect(r.w, `${lang} "${r.s}" ${r.px}px is ${r.w.toFixed(0)} px wide, room ${r.maxW.toFixed(0)}`).toBeLessThanOrEqual(r.maxW + 0.6);
        if (lang === 'ko') worst = Math.min(worst, r.px / r.reqPx);
      }
    }
    // Korean legends may shrink, but never to unreadable sizes.
    expect(worst).toBeGreaterThanOrEqual(0.5);
    // Hangul actually reaches the canvases.
    expect(ko.filter((r) => HANGUL_RE.test(r.s)).length).toBeGreaterThan(40);
    expect(en.filter((r) => HANGUL_RE.test(r.s)).length).toBe(0);
  });
});
