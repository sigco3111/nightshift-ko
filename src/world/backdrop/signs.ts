/**
 * Generic illuminated sign words (no brands) rendered once into a canvas atlas:
 * 2 × 8 cells of 512 × 128 px. R = letter core, G = soft glow halo (for neon / channel letters).
 * The atlas is mip-mapped so small, distant signs average out instead of shimmering.
 * Words are looked up in signtext.ts (ko / en; the SIGN_WORDS ids stay English) and repainted on a language switch.
 */
import { CanvasTexture, LinearMipmapLinearFilter } from 'three';
import type { Texture } from 'three';
import { onLangChange } from '../../i18n';
import { SIGN_FONT_NARROW, fitPx, st } from '../signtext';
import type { SignKey } from '../signtext';

export const SIGN_WORDS = [
  'HOTEL', 'PARKING', '24H', 'MOTEL', 'DINER', 'OPEN 24H', 'GARAGE', 'PHARMACY',
  'OFFICES', 'GYM', 'LAUNDRY', 'RENTALS', 'CAR WASH', 'STORAGE', 'TAXI', 'BAR',
] as const;
export type SignWord = (typeof SIGN_WORDS)[number];

/** Instance scale.z code for a sign word (billboards use 1). */
export const signCode = (w: SignWord): number => 2 + SIGN_WORDS.indexOf(w);
/** Width / height of the word cell (for sizing the panel). */
export const SIGN_ASPECT = 4;

let _atlas: Texture | null = null;

/** Paints all words into the 1024² canvas in the current language. */
function paint(g: CanvasRenderingContext2D): void {
  const W = 1024;
  const H = 1024;
  g.globalCompositeOperation = 'source-over';
  g.shadowBlur = 0;
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  SIGN_WORDS.forEach((id, i) => {
    const word = st(`word.${id}` as SignKey);
    const cx = (i % 2) * 512 + 256;
    const cy = Math.floor(i / 2) * 128 + 64;
    // Fit the cell (430 of 512 px wide): Hangul is wider per character than the Latin caps.
    fitPx(g, word, 82, 430, (p) => `700 ${p}px ${SIGN_FONT_NARROW}`);
    // Halo (green channel), then crisp core (red channel).
    g.shadowColor = '#00ff00';
    g.shadowBlur = 16;
    g.fillStyle = '#00ff00';
    g.fillText(word, cx, cy + 3, 430);
    g.fillText(word, cx, cy + 3, 430);
    g.shadowBlur = 0;
    g.fillStyle = '#ff0000';
    g.fillText(word, cx, cy + 3, 430);
  });
}

export function signAtlas(): Texture {
  if (_atlas) return _atlas;
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 1024;
  const g = cv.getContext('2d');
  if (g) paint(g);
  const t = new CanvasTexture(cv);
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  _atlas = t;
  if (g) {
    onLangChange(() => {
      paint(g);
      t.needsUpdate = true;
    });
  }
  return t;
}
