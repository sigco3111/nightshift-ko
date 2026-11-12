/**
 * Tiny i18n layer (한글화). Two flat dictionaries (ko default, en kept), `t(key)` for strings built
 * at call time and `tn(key)` / `ta(el, attr, key)` for DOM text that must follow a live language switch.
 * The chosen language is stored in localStorage ('nightshift.lang').
 */

export type Lang = 'ko' | 'en';
export const LANGS: readonly Lang[] = ['ko', 'en'];
const STORE_KEY = 'nightshift.lang';

const en = {
  // document
  'doc.title': 'NIGHTSHIFT — Survive the Midnight',
  'doc.description': 'NIGHTSHIFT: Survive the Midnight. A cinematic rain-soaked highway driving game that runs in your browser.',
  'doc.canvas': 'NIGHTSHIFT game view',
  'doc.noscript': 'NIGHTSHIFT needs JavaScript and WebGL 2 to run.',
  'doc.bootError': 'NIGHTSHIFT could not start: {msg}',

  // loading
  'load.aria': 'Loading',
  'load.initial': 'Loading',
  'load.engine': 'Starting engine',
  'load.vehicle': 'Loading vehicle',
  'load.traffic': 'Loading traffic',
  'load.physics': 'Starting physics',
  'load.effects': 'Preparing effects',
  'load.highway': 'Building the highway',
  'load.textures': 'Loading textures',
  'load.warmup': 'Warming up',
  'load.ready': 'Ready',

  // main menu
  'menu.mainAria': 'Main menu',
  'menu.tagline': 'Survive the Midnight.',
  'menu.play': 'Play',
  'menu.settings': 'Settings',
  'menu.controls': 'Controls',
  'menu.language': 'Language · English',
  'menu.kbTitle': 'NIGHTSHIFT needs a keyboard',
  'menu.kbBody': 'Steering, braking and nitro live on the keys and there are no touch controls. Open this page on a computer to drive.',
  'menu.kbHint': 'Keyboard connected? Press any key.',
  'menu.footA': 'Best experienced with a keyboard',
  'menu.footB': 'headphones recommended',
  'menu.credit': 'Unofficial Korean localization · original by EddizEge (MIT)',
  'menu.bestScore': 'Best score',

  // pause
  'pause.aria': 'Paused',
  'pause.eyebrow': 'Run paused',
  'pause.title': 'Paused',
  'pause.resume': 'Resume',
  'pause.restart': 'Restart',
  'pause.quit': 'Quit to menu',

  // settings
  'set.aria': 'Settings',
  'set.eyebrow': 'Options',
  'set.title': 'Settings',
  'set.quality': 'Graphics quality',
  'set.q.low': 'Low',
  'set.q.medium': 'Medium',
  'set.q.high': 'High',
  'set.q.ultra': 'Ultra',
  'set.volume': 'Master volume',
  'set.mute': 'Mute audio',
  'set.on': 'On',
  'set.off': 'Off',
  'set.language': 'Language',
  'set.back': 'Back',

  // nav legend
  'nav.select': 'Select',
  'nav.adjust': 'Adjust',
  'nav.confirm': 'Confirm',
  'nav.back': 'Back',

  // controls
  'ctl.aria': 'Controls',
  'ctl.eyebrow': 'Keyboard',
  'ctl.title': 'Controls',
  'ctl.accelerate': 'Accelerate',
  'ctl.brake': 'Brake / Reverse',
  'ctl.steer': 'Steer',
  'ctl.handbrake': 'Handbrake',
  'ctl.nitro': 'Nitro',
  'ctl.camera': 'Change camera',
  'ctl.pause': 'Pause',
  'ctl.restart': 'Quick restart',

  // HUD
  'hud.distance': 'Distance',
  'hud.time': 'Time',
  'hud.score': 'Score',
  'hud.combo': 'Combo',
  'hud.nitro': 'Nitro',
  'hud.integrity': 'Integrity',
  'hud.gear': 'Gear',
  'hint.accelerate': 'Accelerate',
  'hint.brake': 'Brake',
  'hint.steer': 'Steer',
  'hint.nitro': 'Nitro',
  'hint.handbrake': 'Handbrake',
  'hint.camera': 'Camera',
  'hint.pause': 'Pause',
  'intro.ready': 'Get ready',

  // game over
  'go.aria': 'Run summary',
  'go.eyebrow': 'Run over',
  'go.cause.default': 'Wrecked',
  'go.finalScore': 'Final score',
  'go.newBest': 'New best',
  'go.distance': 'Distance',
  'go.topSpeed': 'Top speed',
  'go.nearMisses': 'Near misses',
  'go.survival': 'Survival time',
  'go.bestCombo': 'Best combo',
  'go.risk': 'Risk bonus',
  'go.bestScore': 'Best score',
  'go.again': 'Play again',
  'go.menu': 'Main menu',

  // crash causes
  'cause.totalled': 'TOTALLED',
  'cause.barrier': 'SLAMMED INTO THE BARRIER',
  'cause.rear.truck': 'REAR-ENDED A TRUCK',
  'cause.rear.van': 'REAR-ENDED A VAN',
  'cause.rear.traffic': 'REAR-ENDED TRAFFIC',
  'cause.hit.truck': 'COLLIDED WITH A TRUCK',
  'cause.hit.van': 'COLLIDED WITH A VAN',
  'cause.hit.traffic': 'COLLIDED WITH TRAFFIC',
  'cause.behind': 'HIT FROM BEHIND',
  'cause.fire': 'DROVE INTO THE FIRE',
  'cause.wreck': 'HIT A WRECK',

  // popups / banners
  'popup.nearMiss': 'NEAR MISS',
  'popup.graphics': 'GRAPHICS: {level}',
  'bonus.redLine': 'RED LINE',
  'bonus.highSpeed': 'HIGH SPEED',
  'bonus.needle': 'THREAD THE NEEDLE',
  'bonus.chain': 'CHAIN REACTION SURVIVED',
  'bonus.lastSecond': 'LAST-SECOND ESCAPE',
  'bonus.wreck': 'ESCAPED THE WRECK',
  'banner.warning': 'Warning',
  'banner.notice': 'Notice',
  'banner.pileup': 'PILE-UP AHEAD — KEEP LEFT',
  'banner.incomingLeft': 'INCOMING — KEEP LEFT',
  'banner.incomingRight': 'INCOMING — KEEP RIGHT',
} as const;

export type Key = keyof typeof en;

const ko: Record<Key, string> = {
  'doc.title': 'NIGHTSHIFT 나이트시프트 — 자정을 살아남아라',
  'doc.description': '나이트시프트(NIGHTSHIFT): 비 내리는 한밤의 고속도로를 달리는 시네마틱 드라이빙 게임. 브라우저에서 바로 실행됩니다. (비공식 한글화)',
  'doc.canvas': 'NIGHTSHIFT 게임 화면',
  'doc.noscript': 'NIGHTSHIFT를 실행하려면 JavaScript와 WebGL 2가 필요합니다.',
  'doc.bootError': 'NIGHTSHIFT를 시작할 수 없습니다: {msg}',

  'load.aria': '불러오는 중',
  'load.initial': '불러오는 중',
  'load.engine': '엔진 시동 중',
  'load.vehicle': '차량 불러오는 중',
  'load.traffic': '교통 차량 불러오는 중',
  'load.physics': '물리 엔진 시작 중',
  'load.effects': '효과 준비 중',
  'load.highway': '고속도로 건설 중',
  'load.textures': '텍스처 불러오는 중',
  'load.warmup': '예열 중',
  'load.ready': '준비 완료',

  'menu.mainAria': '메인 메뉴',
  'menu.tagline': '나이트시프트 · 자정을 살아남아라.',
  'menu.play': '플레이',
  'menu.settings': '설정',
  'menu.controls': '조작법',
  'menu.language': '언어 · 한국어',
  'menu.kbTitle': 'NIGHTSHIFT에는 키보드가 필요합니다',
  'menu.kbBody': '조향, 브레이크, 니트로를 모두 키보드로 조작하며 터치 조작은 지원하지 않습니다. 컴퓨터에서 이 페이지를 열어 플레이하세요.',
  'menu.kbHint': '키보드가 연결되어 있나요? 아무 키나 누르세요.',
  'menu.footA': '키보드 플레이 권장',
  'menu.footB': '헤드폰 권장',
  'menu.credit': '비공식 한글화 · 원작 EddizEge (MIT)',
  'menu.bestScore': '최고 점수',

  'pause.aria': '일시정지',
  'pause.eyebrow': '주행 중단',
  'pause.title': '일시정지',
  'pause.resume': '계속하기',
  'pause.restart': '다시 시작',
  'pause.quit': '메뉴로 나가기',

  'set.aria': '설정',
  'set.eyebrow': '옵션',
  'set.title': '설정',
  'set.quality': '그래픽 품질',
  'set.q.low': '낮음',
  'set.q.medium': '보통',
  'set.q.high': '높음',
  'set.q.ultra': '최고',
  'set.volume': '마스터 볼륨',
  'set.mute': '음소거',
  'set.on': '켜짐',
  'set.off': '꺼짐',
  'set.language': '언어 / Language',
  'set.back': '뒤로',

  'nav.select': '선택',
  'nav.adjust': '조절',
  'nav.confirm': '확인',
  'nav.back': '뒤로',

  'ctl.aria': '조작법',
  'ctl.eyebrow': '키보드',
  'ctl.title': '조작법',
  'ctl.accelerate': '가속',
  'ctl.brake': '브레이크 / 후진',
  'ctl.steer': '조향',
  'ctl.handbrake': '핸드브레이크',
  'ctl.nitro': '니트로',
  'ctl.camera': '카메라 전환',
  'ctl.pause': '일시정지',
  'ctl.restart': '빠른 재시작',

  'hud.distance': '거리',
  'hud.time': '시간',
  'hud.score': '점수',
  'hud.combo': '콤보',
  'hud.nitro': '니트로',
  'hud.integrity': '내구도',
  'hud.gear': '기어',
  'hint.accelerate': '가속',
  'hint.brake': '브레이크',
  'hint.steer': '조향',
  'hint.nitro': '니트로',
  'hint.handbrake': '핸드브레이크',
  'hint.camera': '카메라',
  'hint.pause': '일시정지',
  'intro.ready': '준비하세요',

  'go.aria': '주행 결과',
  'go.eyebrow': '주행 종료',
  'go.cause.default': '충돌 사고',
  'go.finalScore': '최종 점수',
  'go.newBest': '신기록',
  'go.distance': '거리',
  'go.topSpeed': '최고 속도',
  'go.nearMisses': '니어 미스',
  'go.survival': '생존 시간',
  'go.bestCombo': '최고 콤보',
  'go.risk': '위험 보너스',
  'go.bestScore': '최고 점수',
  'go.again': '다시 플레이',
  'go.menu': '메인 메뉴',

  'cause.totalled': '차량 완파',
  'cause.barrier': '방호벽에 충돌',
  'cause.rear.truck': '트럭 추돌',
  'cause.rear.van': '밴 추돌',
  'cause.rear.traffic': '앞차 추돌',
  'cause.hit.truck': '트럭과 충돌',
  'cause.hit.van': '밴과 충돌',
  'cause.hit.traffic': '다른 차량과 충돌',
  'cause.behind': '뒤에서 추돌당함',
  'cause.fire': '불길 속으로 돌진',
  'cause.wreck': '사고 잔해와 충돌',

  'popup.nearMiss': '니어 미스',
  'popup.graphics': '그래픽: {level}',
  'bonus.redLine': '레드 라인',
  'bonus.highSpeed': '고속 주행',
  'bonus.needle': '바늘구멍 통과',
  'bonus.chain': '연쇄 추돌에서 생존',
  'bonus.lastSecond': '막판 탈출',
  'bonus.wreck': '잔해 탈출',
  'banner.warning': '경고',
  'banner.notice': '알림',
  'banner.pileup': '전방 연쇄 추돌 — 왼쪽으로',
  'banner.incomingLeft': '위험 접근 — 왼쪽으로',
  'banner.incomingRight': '위험 접근 — 오른쪽으로',
};

export const DICT: Record<Lang, Record<Key, string>> = { en, ko };

function readStored(): Lang | null {
  try {
    const v = localStorage.getItem(STORE_KEY);
    return v === 'ko' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

let lang: Lang = readStored() ?? 'ko';

export function getLang(): Lang {
  return lang;
}

function fmt(s: string, params?: Record<string, string | number>): string {
  return params ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : s;
}

/** Translate now. Unknown keys fall back to English, then to the key itself. */
export function t(key: Key, params?: Record<string, string | number>): string {
  return fmt(DICT[lang][key] ?? DICT.en[key] ?? key, params);
}

interface TextBinding {
  node: Text;
  key: Key;
  params?: Record<string, string | number>;
}
interface AttrBinding {
  el: Element;
  attr: string;
  key: Key;
}
const textBindings: TextBinding[] = [];
const attrBindings: AttrBinding[] = [];
const listeners = new Set<(l: Lang) => void>();

/** A text node that is rewritten whenever the language changes. */
export function tn(key: Key, params?: Record<string, string | number>): Text {
  const node = document.createTextNode(t(key, params));
  textBindings.push({ node, key, params });
  return node;
}

/** Set an attribute from a key and keep it in sync with the language. */
export function ta(el: Element, attr: string, key: Key): void {
  el.setAttribute(attr, t(key));
  attrBindings.push({ el, attr, key });
}

export function onLangChange(fn: (l: Lang) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function applyDocument(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.title = t('doc.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('doc.description'));
  document.getElementById('game')?.setAttribute('aria-label', t('doc.canvas'));
}

export function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem(STORE_KEY, next);
  } catch {
    /* storage blocked: the choice lasts for this page session */
  }
  for (const b of textBindings) b.node.data = t(b.key, b.params);
  for (const b of attrBindings) b.el.setAttribute(b.attr, t(b.key));
  applyDocument();
  for (const fn of listeners) fn(lang);
}

/** Apply the stored language to the static parts of index.html. Call once at start-up. */
export function initI18n(): void {
  applyDocument();
  const nk = document.querySelector('noscript');
  if (nk) nk.textContent = t('doc.noscript');
}
