/**
 * Texts drawn on the 3D road signs / backdrop signs / structure signs (한글화) + Hangul-safe fonts.
 * File name is all lower-case on purpose. All place names are invented (no real roads); in ko they are
 * transliterated into Hangul, route codes (M7, A41, A9, A520) and "SOS" stay as printed in en, distances use
 * m / km. Canvas textures are painted once; each painter repaints on a language switch (see onLangChange).
 */
import { getLang } from '../i18n';
import type { Lang } from '../i18n';

const en = {
  // guide signs (gantry)
  'place.northgate': 'NORTHGATE',
  'place.portEllison': 'Port Ellison',
  'place.cityCentre': 'CITY CENTRE',
  'place.harbour': 'Harbour District',
  'place.westmere': 'Westmere',
  'place.kingsford': 'Kingsford',
  'place.brayfield': 'Brayfield',
  'place.airport': 'AIRPORT',
  'place.terminals': 'Terminals 1-3',
  'place.through': 'THROUGH TRAFFIC',
  'place.ashNorth': 'Ashcombe  ·  Northgate',
  'place.riverside': 'RIVERSIDE',
  'place.docklands': 'Docklands',
  'place.ashcombe': 'Ashcombe',
  'place.halloway': 'Halloway',
  'place.retail': 'Retail Park',
  'place.industrial': 'Industrial Est.',
  'sign.exit14': 'EXIT 14',
  'sign.exit15': 'EXIT 15',
  'sign.exit16': 'EXIT 16',
  'sign.halfMile': '½ mile',
  'sign.oneMile': '1 mile',
  'sign.km': 'km',
  // variable-message signs (2 lines each)
  'vms.1a': 'HEAVY RAIN',
  'vms.1b': 'REDUCE SPEED',
  'vms.2a': 'ACCIDENT AHEAD',
  'vms.2b': 'KEEP LEFT',
  'vms.3a': 'SURFACE WATER',
  'vms.3b': 'SLOW DOWN',
  'vms.4a': 'SPRAY  POOR VIS',
  'vms.4b': 'USE HEADLIGHTS',
  // verge signs
  'sign.sos': 'SOS',
  'sign.emergency': 'EMERGENCY',
  'sign.area1': 'EMERGENCY',
  'sign.area2': 'AREA',
  // backdrop (illuminated words)
  'word.HOTEL': 'HOTEL',
  'word.PARKING': 'PARKING',
  'word.24H': '24H',
  'word.MOTEL': 'MOTEL',
  'word.DINER': 'DINER',
  'word.OPEN 24H': 'OPEN 24H',
  'word.GARAGE': 'GARAGE',
  'word.PHARMACY': 'PHARMACY',
  'word.OFFICES': 'OFFICES',
  'word.GYM': 'GYM',
  'word.LAUNDRY': 'LAUNDRY',
  'word.RENTALS': 'RENTALS',
  'word.CAR WASH': 'CAR WASH',
  'word.STORAGE': 'STORAGE',
  'word.TAXI': 'TAXI',
  'word.BAR': 'BAR',
  // structures (tunnel / bridge)
  'st.tunnelName': 'MERIDIAN TUNNEL',
  'st.bridgeName': 'RIVER  VALE  BRIDGE',
  'st.tunnelExit': 'TUNNEL EXIT',
} as const;

export type SignKey = keyof typeof en;

const ko: Record<SignKey, string> = {
  'place.northgate': '노스게이트',
  'place.portEllison': '포트 엘리슨',
  'place.cityCentre': '시내 중심가',
  'place.harbour': '항만 지구',
  'place.westmere': '웨스트미어',
  'place.kingsford': '킹스포드',
  'place.brayfield': '브레이필드',
  'place.airport': '공항',
  'place.terminals': '터미널 1-3',
  'place.through': '통과 차량',
  'place.ashNorth': '애시콤  ·  노스게이트',
  'place.riverside': '리버사이드',
  'place.docklands': '도크랜드',
  'place.ashcombe': '애시콤',
  'place.halloway': '할로웨이',
  'place.retail': '쇼핑 파크',
  'place.industrial': '산업단지',
  'sign.exit14': '출구 14',
  'sign.exit15': '출구 15',
  'sign.exit16': '출구 16',
  'sign.halfMile': '800 m',
  'sign.oneMile': '1.6 km',
  'sign.km': 'km',
  'vms.1a': '폭우 주의',
  'vms.1b': '속도를 줄이세요',
  'vms.2a': '전방 사고 발생',
  'vms.2b': '좌측으로 진행',
  'vms.3a': '노면 물고임',
  'vms.3b': '서행하세요',
  'vms.4a': '물보라 시야불량',
  'vms.4b': '전조등을 켜세요',
  'sign.sos': 'SOS',
  'sign.emergency': '비상',
  'sign.area1': '비상',
  'sign.area2': '주차대',
  'word.HOTEL': '호텔',
  'word.PARKING': '주차장',
  'word.24H': '24시',
  'word.MOTEL': '모텔',
  'word.DINER': '식당',
  'word.OPEN 24H': '24시간 영업',
  'word.GARAGE': '정비소',
  'word.PHARMACY': '약국',
  'word.OFFICES': '사무실',
  'word.GYM': '헬스장',
  'word.LAUNDRY': '세탁소',
  'word.RENTALS': '렌터카',
  'word.CAR WASH': '세차장',
  'word.STORAGE': '창고',
  'word.TAXI': '택시',
  'word.BAR': '바',
  'st.tunnelName': '메리디안 터널',
  'st.bridgeName': '리버 베일 대교',
  'st.tunnelExit': '터널 출구',
};

export const SIGN_DICT: Record<Lang, Record<SignKey, string>> = { en, ko };

/** Sign text in the current language. */
export function st(key: SignKey, lang: Lang = getLang()): string {
  return SIGN_DICT[lang][key] ?? SIGN_DICT.en[key];
}

export const HANGUL_RE = /[\u1100-\u11ff\u3131-\u318e\uac00-\ud7a3]/;

/** Latin display faces first (Latin glyphs keep the original look), Hangul falls through to system fonts. */
export const LATIN_STACK = 'Arial, Helvetica, "Segoe UI"';
export const NARROW_STACK = '"Arial Narrow", Arial, Helvetica';
export const HANGUL_STACK = '"Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
export const SIGN_FONT = `${LATIN_STACK}, ${HANGUL_STACK}`;
export const SIGN_FONT_NARROW = `${NARROW_STACK}, ${HANGUL_STACK}`;

interface Measure {
  font: string;
  measureText(s: string): { width: number };
}

/**
 * Largest pixel size <= px at which `s` is at most maxW wide (re-measured, so letterSpacing counts).
 * Never below px * minRatio; callers also pass maxW to fillText as a last-resort horizontal squash.
 * `apply(size)` runs before each measurement (used to scale letterSpacing together with the size).
 */
export function fitPx(c: Measure, s: string, px: number, maxW: number, fontOf: (px: number) => string, minRatio = 0.5, apply?: (size: number) => void): number {
  let size = px;
  for (let i = 0; i < 5; i++) {
    apply?.(size);
    c.font = fontOf(size);
    const w = c.measureText(s).width;
    if (w <= maxW) break;
    size = Math.max(px * minRatio, Math.floor(size * (maxW / w) * 10) / 10);
  }
  apply?.(size);
  c.font = fontOf(size);
  return size;
}
