/**
 * Menu shell: main menu, pause, settings and controls share one left-column layout over a
 * left-to-transparent scrim, so the live 3D scene stays visible centre-right.
 * Screens form a tiny stack (settings/controls remember whether they came from main or pause).
 */
import type { QualityLevel } from '../core/types';
import { arrowIcon, h, kbd, setOpen, wordmark } from './dom';
import { readBest } from './gameover';
import { formatScore } from './hud';
import { LANGS, getLang, onLangChange, setLang, ta, tn, type Key, type Lang } from '../i18n';
import { NavList, menuButton, segmented, slider, toggle, type SegmentedControl, type SliderControl, type ToggleControl, type UiSound } from './nav';

export type ScreenId = 'main' | 'pause' | 'settings' | 'controls';

export interface MenuActions {
  play(): void;
  resume(): void;
  /** Esc on the pause root (mirrors the in-game Esc toggle). */
  pauseToggle(): void;
  restart(): void;
  quit(): void;
  setQuality(level: QualityLevel): void;
  setVolume(v: number): void;
  setMuted(m: boolean): void;
}

const LANG_NAME: Record<Lang, string> = { ko: '한국어', en: 'English' };
const QUALITY: readonly QualityLevel[] = ['low', 'medium', 'high', 'ultra'];

interface Screen {
  el: HTMLElement;
  nav: NavList;
  /** Called every time the screen is shown. */
  onShow?: () => void;
}

export class Menus {
  readonly el: HTMLElement;
  private readonly screens: Record<ScreenId, Screen>;
  private current: ScreenId | null = null;
  /** Where settings/controls return to. */
  private returnTo: ScreenId = 'main';
  private readonly bestLine: HTMLElement;
  private readonly quality: SegmentedControl;
  private readonly volume: SliderControl;
  private readonly mute: ToggleControl;
  private readonly language: SegmentedControl;
  /** Menu item to re-select when coming back from a sub screen. */
  private readonly origin: Partial<Record<ScreenId, Partial<Record<ScreenId, HTMLElement>>>> = {};

  constructor(
    private readonly sound: (n: UiSound) => void,
    private readonly actions: MenuActions,
  ) {
    // ── main
    const mark = wordmark('h1');
    const tagline = h('p.ns-tagline', null, tn('menu.tagline'));
    const bPlay = menuButton(tn('menu.play'), { primary: true });
    const bSettings = menuButton(tn('menu.settings'));
    const bControls = menuButton(tn('menu.controls'));
    const bLang = menuButton(tn('menu.language'));
    bLang.classList.add('ns-btn--lang');
    this.bestLine = h('div.ns-bestline');
    // Shown instead of the menu list on touch-only devices (CSS: .ns[data-touch]:not([data-kb])).
    const kbNote = h(
      'div.ns-kbnote',
      { role: 'note' },
      h('div.ns-kbnote__icon', { 'aria-hidden': 'true' }, ...['W', 'A', 'S', 'D'].map((k) => kbd(k))),
      h('p.ns-kbnote__title', null, tn('menu.kbTitle')),
      h('p.ns-kbnote__body', null, tn('menu.kbBody')),
      h('p.ns-kbnote__hint', null, tn('menu.kbHint')),
    );
    const mainNav = new NavList(
      [
        { el: bPlay, activate: () => (this.sound('uiStart'), this.actions.play()) },
        { el: bSettings, activate: () => this.open('settings', true) },
        { el: bControls, activate: () => this.open('controls', true) },
        { el: bLang, activate: () => (this.sound('uiClick'), setLang(getLang() === 'ko' ? 'en' : 'ko')) },
      ],
      sound,
    );
    const mainEl = h(
      'section.ns-screen.ns-screen--main.ns-stagger',
      null,
      h('header.ns-brand', null, mark, h('span.ns-brand__rule', { 'aria-hidden': 'true' }), tagline),
      kbNote,
      h('nav.ns-list', { role: 'menu' }, bPlay, bSettings, bControls, bLang),
      this.bestLine,
      h(
        'footer.ns-foot',
        null,
        tn('menu.footA'),
        h('span.ns-dot', { 'aria-hidden': 'true' }, '·'),
        tn('menu.footB'),
        h('div.ns-credit', null, tn('menu.credit')),
      ),
    );

    // ── pause
    const pResume = menuButton(tn('pause.resume'), { primary: true, hint: 'Esc' });
    const pRestart = menuButton(tn('pause.restart'), { hint: 'R' });
    const pSettings = menuButton(tn('menu.settings'));
    const pQuit = menuButton(tn('pause.quit'));
    const pauseNav = new NavList(
      [
        { el: pResume, activate: () => (this.sound('uiClick'), this.actions.resume()) },
        { el: pRestart, activate: () => (this.sound('uiStart'), this.actions.restart()) },
        { el: pSettings, activate: () => this.open('settings', true) },
        { el: pQuit, activate: () => (this.sound('uiBack'), this.actions.quit()) },
      ],
      sound,
    );
    pauseNav.onBack = () => (this.sound('uiBack'), this.actions.pauseToggle());
    const pauseEl = h(
      'section.ns-screen.ns-screen--pause.ns-stagger',
      null,
      h('header.ns-head', null, h('div.ns-eyebrow', null, tn('pause.eyebrow')), h('h2.ns-title', null, tn('pause.title'))),
      h('nav.ns-list', { role: 'menu' }, pResume, pRestart, pSettings, pQuit),
    );

    // ── settings
    this.quality = segmented('set.quality', ['set.q.low', 'set.q.medium', 'set.q.high', 'set.q.ultra'], (i) => this.actions.setQuality(QUALITY[i]!), sound);
    this.volume = slider('set.volume', (v) => this.actions.setVolume(v), sound);
    this.mute = toggle('set.mute', (m) => this.actions.setMuted(m), sound);
    const sBack = menuButton(tn('set.back'), { hint: 'Esc' });
    sBack.classList.add('ns-btn--back');
    this.language = segmented('set.language', LANGS.map((l) => ({ text: LANG_NAME[l] })), (i) => setLang(LANGS[i]!), sound);
    this.language.set(LANGS.indexOf(getLang()));
    onLangChange((l) => this.language.set(LANGS.indexOf(l)));
    const settingsNav = new NavList(
      [this.quality, this.volume, this.mute, this.language, { el: sBack, activate: () => this.back() }],
      sound,
    );
    settingsNav.onBack = () => this.back();
    const settingsEl = h(
      'section.ns-screen.ns-screen--settings.ns-stagger',
      null,
      h('header.ns-head', null, h('div.ns-eyebrow', null, tn('set.eyebrow')), h('h2.ns-title', null, tn('set.title'))),
      h('div.ns-rows', null, this.quality.el, this.volume.el, this.mute.el, this.language.el),
      h('div.ns-list.ns-list--back', null, sBack),
      navLegend(true),
    );

    // ── controls
    const cBack = menuButton(tn('set.back'), { hint: 'Esc' });
    cBack.classList.add('ns-btn--back');
    const controlsNav = new NavList([{ el: cBack, activate: () => this.back() }], sound);
    controlsNav.onBack = () => this.back();
    const key = (k: string | Node): HTMLElement => kbd(k);
    const or = (): HTMLElement => h('span.ns-or', null, '/');
    const ctl = (keys: Node[], label: Key): HTMLElement =>
      h('div.ns-ctl', null, h('span.ns-ctl__keys', null, ...keys), h('span.ns-ctl__label', null, tn(label)));
    const controlsEl = h(
      'section.ns-screen.ns-screen--controls.ns-stagger',
      null,
      h('header.ns-head', null, h('div.ns-eyebrow', null, tn('ctl.eyebrow')), h('h2.ns-title', null, tn('ctl.title'))),
      h(
        'div.ns-ctls',
        null,
        ctl([key('W'), or(), key(arrowIcon('up'))], 'ctl.accelerate'),
        ctl([key('S'), or(), key(arrowIcon('down'))], 'ctl.brake'),
        ctl([key('A'), key('D'), or(), key(arrowIcon('left')), key(arrowIcon('right'))], 'ctl.steer'),
        ctl([key('Space')], 'ctl.handbrake'),
        ctl([key('Shift')], 'ctl.nitro'),
        ctl([key('C')], 'ctl.camera'),
        ctl([key('Esc'), or(), key('P')], 'ctl.pause'),
        ctl([key('R')], 'ctl.restart'),
      ),
      h('div.ns-list.ns-list--back', null, cBack),
    );

    this.origin.main = { settings: bSettings, controls: bControls };
    this.origin.pause = { settings: pSettings };
    ta(mainEl, 'aria-label', 'menu.mainAria');
    ta(pauseEl, 'aria-label', 'pause.aria');
    ta(settingsEl, 'aria-label', 'set.aria');
    ta(controlsEl, 'aria-label', 'ctl.aria');
    this.screens = {
      main: { el: mainEl, nav: mainNav, onShow: () => this.renderBest() },
      pause: { el: pauseEl, nav: pauseNav },
      settings: { el: settingsEl, nav: settingsNav },
      controls: { el: controlsEl, nav: controlsNav },
    };
    for (const s of Object.values(this.screens)) setOpen(s.el, false);

    this.el = h('div.ns-layer.ns-menu', null, h('div.ns-scrim.ns-scrim--menu', { 'aria-hidden': 'true' }), mainEl, pauseEl, settingsEl, controlsEl);
  }

  get screen(): ScreenId | null {
    return this.current;
  }

  get nav(): NavList | null {
    return this.current ? this.screens[this.current].nav : null;
  }

  /** Show a screen. `push` = navigate forward from the current screen (remember the way back). */
  open(id: ScreenId, push = false): void {
    if (push) {
      this.sound('uiClick');
      if (this.current === 'main' || this.current === 'pause') this.returnTo = this.current;
    }
    if (id === 'main' || id === 'pause') this.returnTo = id;
    if (this.current && this.current !== id) setOpen(this.screens[this.current].el, false);
    this.current = id;
    const s = this.screens[id];
    s.onShow?.();
    setOpen(s.el, true);
    // Entering a screen selects its first item (games reset to the top; predictable for Enter-mashing).
    s.nav.refresh(0);
    this.el.setAttribute('data-screen', id);
  }

  close(): void {
    if (this.current) setOpen(this.screens[this.current].el, false);
    this.current = null;
  }

  back(): void {
    if (this.current === 'settings' || this.current === 'controls') {
      this.sound('uiBack');
      const from = this.current;
      this.open(this.returnTo);
      // Land on the item we came from (Settings / Controls) instead of the top.
      const nav = this.screens[this.returnTo].nav;
      const idx = nav.items.findIndex((it) => it.el === this.origin[this.returnTo]?.[from]);
      if (idx >= 0) nav.refresh(idx);
    }
  }

  setSettings(s: { quality: QualityLevel; volume: number; muted: boolean }): void {
    this.quality.set(Math.max(0, QUALITY.indexOf(s.quality)));
    this.volume.set(s.volume);
    this.mute.set(s.muted);
  }

  private renderBest(): void {
    const best = readBest();
    this.bestLine.replaceChildren();
    if (best === null) return;
    this.bestLine.append(h('span.ns-label', null, tn('menu.bestScore')), h('span.ns-bestline__value', null, formatScore(best)));
  }
}

function navLegend(adjust: boolean): HTMLElement {
  const item = (keys: Node[], label: Key): HTMLElement => h('span.ns-legend__item', null, ...keys, h('span', null, tn(label)));
  return h(
    'div.ns-legend',
    { 'aria-hidden': 'true' },
    item([kbd(arrowIcon('up')), kbd(arrowIcon('down'))], 'nav.select'),
    adjust ? item([kbd(arrowIcon('left')), kbd(arrowIcon('right'))], 'nav.adjust') : null,
    item([kbd('Enter')], 'nav.confirm'),
    item([kbd('Esc')], 'nav.back'),
  );
}
