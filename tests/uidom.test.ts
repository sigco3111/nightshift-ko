/**
 * DOM-level test of the UI layer with jsdom (no WebGL): builds the real menu / HUD / game-over /
 * popups, checks the Korean texts, the live language switch, and that no stray English is left in ko.
 * Skipped when jsdom is not installed (it is not a project dependency: `npm i --no-save jsdom`).
 */
import { describe, expect, it } from 'vitest';

let JSDOM: typeof import('jsdom').JSDOM | null = null;
try {
  JSDOM = (await import('jsdom')).JSDOM;
} catch {
  JSDOM = null;
}

const ALLOWED = new Set(['NIGHTSHIFT', 'NIGHT', 'SHIFT', 'km', 'km/h', 'W', 'A', 'S', 'D', 'C', 'R', 'P', 'Esc', 'Enter', 'Space', 'Shift', 'N', 'English', 'Language', 'MIT', 'EddizEge', 'LOW', 'MEDIUM', 'HIGH', 'ULTRA']);

describe.skipIf(!JSDOM)('UI DOM (jsdom)', () => {
  it('renders Korean by default, switches live, and leaves no English words', async () => {
    const dom = new JSDOM!('<!doctype html><html lang="ko"><head><title>x</title><meta name="description" content="x"></head><body><canvas id="game"></canvas><div id="ui"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
    const g = globalThis as Record<string, unknown>;
    for (const k of ['window', 'document', 'localStorage', 'HTMLElement', 'HTMLButtonElement', 'Node', 'Text', 'KeyboardEvent', 'MouseEvent', 'URLSearchParams', 'requestAnimationFrame', 'cancelAnimationFrame']) {
      try {
        g[k] = (dom.window as unknown as Record<string, unknown>)[k];
      } catch {
        Object.defineProperty(globalThis, k, { value: (dom.window as unknown as Record<string, unknown>)[k], configurable: true });
      }
    }
    Object.defineProperty(globalThis, 'matchMedia', { value: () => ({ matches: false }), configurable: true });
    (dom.window.HTMLElement.prototype as unknown as { animate: () => unknown }).animate = () => ({ cancel() {} });
    (dom.window.HTMLElement.prototype as unknown as { getAnimations: () => unknown[] }).getAnimations = () => [];

    const { EventBus } = await import('../src/core/events');
    const { createUi } = await import('../src/ui');
    const i18n = await import('../src/i18n');
    i18n.initI18n();
    const root = document.getElementById('ui')!;
    const ui = createUi({ events: new EventBus(), root });
    ui.setLoading(0.5, i18n.t('load.warmup'));
    ui.setState('menu');

    const txt = (sel: string): string => root.querySelector(sel)?.textContent ?? '';
    expect(document.documentElement.lang).toBe('ko');
    expect(document.title).toContain('나이트시프트');
    expect(txt('.ns-wordmark')).toBe('NIGHTSHIFT');
    expect(txt('.ns-tagline')).toContain('나이트시프트');
    const labels = [...root.querySelectorAll('.ns-screen--main .ns-btn__label')].map((e) => e.textContent);
    expect(labels).toEqual(['플레이', '설정', '조작법', '언어 · 한국어']);
    expect(txt('.ns-loading__label')).toBe('예열 중');
    expect(txt('.ns-screen--settings .ns-title')).toBe('설정');
    expect(txt('.ns-screen--controls .ns-title')).toBe('조작법');
    expect(txt('.ns-screen--pause .ns-title')).toBe('일시정지');

    // HUD + game over + popups + banner
    ui.setState('playing');
    ui.popup(`${i18n.t('popup.nearMiss')}  +250`, 'nearMiss');
    ui.popup(`${i18n.t('bonus.needle')}  +500`, 'bonus');
    ui.banner(i18n.t('banner.pileup'), 'warning');
    expect(txt('.ns-banner__eyebrow')).toBe('경고');
    expect(txt('.ns-popup__label')).toBe('바늘구멍 통과');
    ui.setState('crashed');
    ui.showGameOver({ cause: i18n.t('cause.rear.truck'), score: 1234, bestScore: 2000, isNewBest: false, distance: 1500, topSpeedKmh: 180, nearMisses: 3, survivalTime: 75.4, bestCombo: 3, riskBonus: 500 } as never);
    ui.setState('gameover');
    expect(txt('.ns-go__cause')).toBe('트럭 추돌');
    expect(txt('.ns-go .ns-eyebrow')).toBe('주행 종료');

    // no English words anywhere in the ko UI (ignore allowlisted tokens)
    const stray = new Set<string>();
    const walker = document.createTreeWalker(root, 4 /* SHOW_TEXT */);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if ((n.parentElement as Element).closest('kbd')) continue;
      for (const m of (n.textContent ?? '').matchAll(/[A-Za-z][A-Za-z/]*/g)) if (!ALLOWED.has(m[0])) stray.add(m[0]);
    }
    expect([...stray]).toEqual([]);

    // live switch to English
    i18n.setLang('en');
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('nightshift.lang')).toBe('en');
    expect([...root.querySelectorAll('.ns-screen--main .ns-btn__label')].map((e) => e.textContent)).toEqual(['Play', 'Settings', 'Controls', 'Language · English']);
    expect(txt('.ns-screen--settings .ns-title')).toBe('Settings');
    expect(txt('.ns-hud__tl .ns-label')).toBe('Distance');
    expect(txt('.ns-go .ns-eyebrow')).toBe('Run over');
    expect(document.title).toContain('Survive the Midnight');
    // and back
    i18n.setLang('ko');
    expect(txt('.ns-screen--main .ns-btn__label')).toBe('플레이');
    expect(localStorage.getItem('nightshift.lang')).toBe('ko');
  });
});
