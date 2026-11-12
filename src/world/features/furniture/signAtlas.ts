/**
 * One 2048² canvas atlas for every sign face (gantry guide signs, variable-message signs,
 * verge signs, hectometre glyphs) + a matching emissive canvas:
 *   - guide signs glow faintly (≈ 0.25 linear) so they read beyond the headlights
 *   - VMS LED dots are full amber (× emissiveScale = 6)
 *   - verge signs are not lit (retro-reflection only)
 * All legends are invented; no real agency logos. Legends come from signtext.ts (ko / en) and the whole
 * atlas is repainted in place when the language is switched (layout and UVs never change).
 */
import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';
import { makeRng } from '../../../core/math';
import { onLangChange } from '../../../i18n';
import { SIGN_FONT, fitPx, HANGUL_RE, st } from '../../signtext';

export interface UvRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export interface SignAtlas {
  albedo: CanvasTexture;
  emissive: CanvasTexture;
  emissiveScale: number;
  guide: UvRect[];
  /** Index into `guide` of the narrower exit signs. */
  exitGuide: number[];
  vms: UvRect[];
  small: Record<SmallSign, UvRect>;
  /** Hectometre plate glyphs: '0'-'9', '.', 'L' (left edge), 'R' (right edge). */
  glyph: Record<string, UvRect>;
}

export type SmallSign = 'speed100' | 'speed80' | 'chevron' | 'sos' | 'exitAdv' | 'eArea';

const SIZE = 2048;
const EMISSIVE_SCALE = 6;
/** sRGB multiplier that gives ≈ 0.25 / 6 linear: faint self-illumination of guide signs. */
const GUIDE_GLOW = 0.232;
const FONT = SIGN_FONT;

let atlas: SignAtlas | null = null;

type Ctx = CanvasRenderingContext2D;

interface GuideDef {
  bg: string;
  draw: (c: Ctx, w: number, h: number) => void;
  exit?: boolean;
}

const GREEN = '#0b5a37';
const BLUE = '#0d3f8c';
const WHITE = '#f2f2ec';

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** Width of the cell currently being painted (text never runs past its inner margin). */
let cellW = SIZE;
const MARGIN = 32;

/** Draws text, shrinking it (Hangul is wider than Latin) so it stays inside the cell; maxW overrides the default room. */
function text(c: Ctx, s: string, x: number, y: number, px: number, align: CanvasTextAlign = 'left', color = WHITE, weight = 'bold', maxW?: number): void {
  const room = maxW ?? (align === 'left' ? cellW - MARGIN - x : align === 'right' ? x - MARGIN : 2 * Math.min(x - MARGIN, cellW - MARGIN - x));
  fitPx(c, s, px, room, (p) => `${weight} ${p}px ${FONT}`);
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = 'alphabetic';
  c.fillText(s, x, y, room);
}

/** Down arrow (lane arrow) centred at x, from y0 to y1. */
function downArrow(c: Ctx, x: number, y0: number, y1: number, w: number, color = WHITE): void {
  const hw = w * 0.5;
  const sh = w * 0.18;
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x - sh, y0);
  c.lineTo(x + sh, y0);
  c.lineTo(x + sh, y1 - hw);
  c.lineTo(x + hw, y1 - hw);
  c.lineTo(x, y1);
  c.lineTo(x - hw, y1 - hw);
  c.lineTo(x - sh, y1 - hw);
  c.closePath();
  c.fill();
}

/** Up-right diagonal exit arrow. */
function exitArrow(c: Ctx, x: number, y: number, s: number, color = WHITE): void {
  c.save();
  c.translate(x, y);
  c.rotate(Math.PI / 4);
  c.fillStyle = color;
  c.beginPath();
  const sh = s * 0.16;
  c.moveTo(-sh, s * 0.5);
  c.lineTo(sh, s * 0.5);
  c.lineTo(sh, -s * 0.1);
  c.lineTo(s * 0.36, -s * 0.1);
  c.lineTo(0, -s * 0.5);
  c.lineTo(-s * 0.36, -s * 0.1);
  c.lineTo(-sh, -s * 0.1);
  c.closePath();
  c.fill();
  c.restore();
}

/** Route number box (white outline, white text). */
function routeBox(c: Ctx, s: string, x: number, y: number, px: number, filled = false, bg = GREEN): void {
  c.font = `bold ${px}px ${FONT}`;
  const w = c.measureText(s).width + px * 0.6;
  const h = px * 1.2;
  rr(c, x, y, w, h, px * 0.14);
  if (filled) {
    c.fillStyle = WHITE;
    c.fill();
    text(c, s, x + w / 2, y + h * 0.82, px, 'center', bg);
  } else {
    c.strokeStyle = WHITE;
    c.lineWidth = px * 0.09;
    c.stroke();
    text(c, s, x + w / 2, y + h * 0.82, px, 'center');
  }
}

function exitTab(c: Ctx, label: string, w: number, bg: string): void {
  // A tab on the top-right corner, the classic exit-number plate.
  c.font = `bold 40px ${FONT}`;
  const tw = c.measureText(label).width + 44;
  rr(c, w - tw - 30, 26, tw, 62, 8);
  c.fillStyle = WHITE;
  c.fill();
  text(c, label, w - 30 - tw / 2, 72, 40, 'center', bg);
}

const GUIDES: GuideDef[] = [
  {
    bg: BLUE,
    draw: (c, w, h) => {
      routeBox(c, 'M7', 44, 40, 58);
      text(c, st('place.northgate'), 44, 186, 74);
      text(c, st('place.portEllison'), 44, 266, 64, 'left', WHITE, '600');
      downArrow(c, w * 0.3, 284, h - 26, 66);
      downArrow(c, w * 0.7, 284, h - 26, 66);
    },
  },
  {
    bg: GREEN,
    draw: (c, w, h) => {
      routeBox(c, 'A41', 44, 40, 58, true);
      text(c, st('place.cityCentre'), 44, 186, 70);
      text(c, st('place.harbour'), 44, 262, 60, 'left', WHITE, '600');
      downArrow(c, w * 0.5, 282, h - 26, 66);
    },
  },
  {
    bg: BLUE,
    draw: (c, w) => {
      routeBox(c, 'M7', 44, 34, 52);
      // distance column ("8", "21", "46") is right-aligned at w - 50: leave it ~110 px
      text(c, st('place.westmere'), 44, 168, 60, 'left', WHITE, '600', w - 44 - 110);
      text(c, st('place.kingsford'), 44, 248, 60, 'left', WHITE, '600', w - 44 - 110);
      text(c, st('place.brayfield'), 44, 328, 60, 'left', WHITE, '600', w - 44 - 110);
      text(c, '8', w - 50, 168, 64, 'right');
      text(c, '21', w - 50, 248, 64, 'right');
      text(c, '46', w - 50, 328, 64, 'right');
      text(c, st('sign.km'), w - 50, 80, 34, 'right', WHITE, '600');
    },
  },
  {
    bg: GREEN,
    draw: (c, w, h) => {
      text(c, st('place.airport'), 44, 120, 74, 'left', WHITE, 'bold', w * 0.78 - 60 - 44);
      text(c, st('place.terminals'), 44, 196, 56, 'left', WHITE, '600', w * 0.78 - 60 - 44);
      routeBox(c, 'A9', 44, 228, 50, true);
      downArrow(c, w * 0.78, 120, h - 30, 70);
    },
  },
  {
    bg: BLUE,
    draw: (c, w, h) => {
      text(c, st('place.through'), w / 2, 118, 62, 'center');
      text(c, st('place.ashNorth'), w / 2, 196, 50, 'center', WHITE, '600');
      downArrow(c, w * 0.22, 220, h - 28, 60);
      downArrow(c, w * 0.5, 220, h - 28, 60);
      downArrow(c, w * 0.78, 220, h - 28, 60);
    },
  },
  {
    bg: GREEN,
    draw: (c, w, h) => {
      routeBox(c, 'A520', 44, 40, 54, true);
      text(c, st('place.riverside'), 44, 178, 72);
      text(c, st('place.docklands'), 44, 252, 60, 'left', WHITE, '600');
      downArrow(c, w * 0.32, 276, h - 26, 62);
      downArrow(c, w * 0.68, 276, h - 26, 62);
    },
  },
  {
    bg: GREEN,
    exit: true,
    draw: (c, w) => {
      exitTab(c, st('sign.exit14'), w, GREEN);
      // the exit arrow (centre w - 100, ~±70 wide) sits on the right: keep the legend clear of it
      text(c, st('place.ashcombe'), 44, 196, 76);
      text(c, st('place.halloway'), 44, 276, 64, 'left', WHITE, '600', w - 100 - 78 - 44);
      text(c, st('sign.halfMile'), 44, 350, 52, 'left', WHITE, '600', w - 100 - 78 - 44);
      exitArrow(c, w - 100, 270, 140);
    },
  },
  {
    bg: BLUE,
    exit: true,
    draw: (c, w) => {
      exitTab(c, st('sign.exit15'), w, BLUE);
      routeBox(c, 'A9', 44, 112, 52, true, BLUE);
      text(c, st('place.kingsford'), 44, 262, 74, 'left', WHITE, 'bold', w - 100 - 78 - 44);
      text(c, st('place.retail'), 44, 340, 58, 'left', WHITE, '600', w - 100 - 78 - 44);
      exitArrow(c, w - 100, 270, 140);
    },
  },
  {
    bg: GREEN,
    exit: true,
    draw: (c, w) => {
      exitTab(c, st('sign.exit16'), w, GREEN);
      text(c, st('place.brayfield'), 44, 196, 76);
      text(c, st('place.industrial'), 44, 274, 58, 'left', WHITE, '600', w - 100 - 78 - 44);
      text(c, st('sign.oneMile'), 44, 348, 52, 'left', WHITE, '600', w - 100 - 78 - 44);
      exitArrow(c, w - 100, 270, 140);
    },
  },
];

const VMS_MSGS = (): Array<[string, string]> => [
  [st('vms.1a'), st('vms.1b')],
  [st('vms.2a'), st('vms.2b')],
  [st('vms.3a'), st('vms.3b')],
  [st('vms.4a'), st('vms.4b')],
];

/** Weathering: soft grime gradient + speckles, drawn over a sign rect. */
function weather(c: Ctx, x: number, y: number, w: number, h: number, seed: number, amount = 1): void {
  const rnd = makeRng(seed);
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, `rgba(20,18,12,${0.1 * amount})`);
  g.addColorStop(0.6, 'rgba(20,18,12,0)');
  g.addColorStop(1, `rgba(30,26,18,${0.22 * amount})`);
  c.fillStyle = g;
  c.fillRect(x, y, w, h);
  for (let i = 0; i < 260 * amount; i++) {
    const a = rnd() * 0.08;
    c.fillStyle = `rgba(25,22,15,${a})`;
    const r = 1 + rnd() * 5;
    c.beginPath();
    c.arc(x + rnd() * w, y + rnd() * h, r, 0, Math.PI * 2);
    c.fill();
  }
  // Drip streaks from the top edge.
  for (let i = 0; i < 14 * amount; i++) {
    const sx = x + rnd() * w;
    const len = h * (0.15 + rnd() * 0.5);
    const gg = c.createLinearGradient(0, y, 0, y + len);
    gg.addColorStop(0, `rgba(20,18,12,${0.05 + rnd() * 0.08})`);
    gg.addColorStop(1, 'rgba(20,18,12,0)');
    c.fillStyle = gg;
    c.fillRect(sx, y, 2 + rnd() * 6, len);
  }
}

function uvOf(x: number, y: number, w: number, h: number, inset = 2): UvRect {
  return {
    u0: (x + inset) / SIZE,
    u1: (x + w - inset) / SIZE,
    v1: 1 - (y + inset) / SIZE,
    v0: 1 - (y + h - inset) / SIZE,
  };
}

type Layout = Pick<SignAtlas, 'guide' | 'exitGuide' | 'vms' | 'small' | 'glyph'>;

/** Paints every sign face into the albedo (a) and emissive (e) canvases in the current language. */
function paintAtlas(a: Ctx, e: Ctx): Layout {
  a.clearRect(0, 0, SIZE, SIZE);
  e.fillStyle = '#000';
  e.fillRect(0, 0, SIZE, SIZE);
  const ca = a.canvas;

  const guide: UvRect[] = [];
  const exitGuide: number[] = [];
  // ── guide signs: 3 × 3 cells of 640 × 384 (5 m × 3 m) ──
  const GW = 640;
  const GH = 384;
  GUIDES.forEach((def, i) => {
    const x = (i % 3) * (GW + 8);
    const y = Math.floor(i / 3) * (GH + 8);
    cellW = GW;
    a.save();
    a.translate(x, y);
    a.fillStyle = def.bg;
    a.fillRect(0, 0, GW, GH);
    // Subtle sheeting variation.
    const sh = a.createLinearGradient(0, 0, GW, GH);
    sh.addColorStop(0, 'rgba(255,255,255,0.05)');
    sh.addColorStop(1, 'rgba(0,0,0,0.06)');
    a.fillStyle = sh;
    a.fillRect(0, 0, GW, GH);
    def.draw(a, GW, GH);
    rr(a, 12, 12, GW - 24, GH - 24, 22);
    a.strokeStyle = WHITE;
    a.lineWidth = 9;
    a.stroke();
    a.restore();
    weather(a, x, y, GW, GH, 101 + i * 7);
    // Emissive copy, darkened to the faint self-glow.
    e.drawImage(ca, x, y, GW, GH, x, y, GW, GH);
    e.fillStyle = `rgba(0,0,0,${1 - GUIDE_GLOW})`;
    e.fillRect(x, y, GW, GH);
    guide.push(uvOf(x, y, GW, GH));
    if (def.exit) exitGuide.push(i);
  });

  // ── VMS: 2 × 2 cells of 960 × 256 (6 m × 1.6 m), amber LED matrix ──
  const VW = 960;
  const VH = 256;
  const vms: UvRect[] = [];
  const lo = document.createElement('canvas');
  const COLS = 120;
  const ROWS = 30;
  lo.width = COLS;
  lo.height = ROWS;
  const l = lo.getContext('2d', { willReadFrequently: true })!;
  VMS_MSGS().forEach(([l1, l2], i) => {
    const x = (i % 2) * (VW + 8);
    const y = 3 * (GH + 8) + Math.floor(i / 2) * (VH + 8);
    // Housing face.
    a.fillStyle = '#16171a';
    a.fillRect(x, y, VW, VH);
    a.fillStyle = '#060607';
    a.fillRect(x + 22, y + 22, VW - 44, VH - 44);
    e.fillStyle = '#000';
    e.fillRect(x, y, VW, VH);
    // Rasterise the text at LED resolution.
    l.fillStyle = '#000';
    l.fillRect(0, 0, COLS, ROWS);
    l.fillStyle = '#fff';
    l.textAlign = 'center';
    l.textBaseline = 'alphabetic';
    // Hangul fills its whole em box: 13 px with baselines 13 / 28 keeps both lines inside the 30 LED rows.
    const hangul = HANGUL_RE.test(l1 + l2);
    const lpx = hangul ? 13 : 12;
    l.font = `bold ${lpx}px ${FONT}`;
    const fit = (s: string) => {
      const w = l.measureText(s).width;
      return w > COLS - 6 ? (COLS - 6) / w : 1;
    };
    l.save();
    l.scale(fit(l1), 1);
    l.fillText(l1, COLS / 2 / fit(l1), 13);
    l.restore();
    l.save();
    l.scale(fit(l2), 1);
    l.fillText(l2, COLS / 2 / fit(l2), hangul ? 28 : 27);
    l.restore();
    const px = l.getImageData(0, 0, COLS, ROWS).data;
    const pitchX = (VW - 60) / COLS;
    const pitchY = (VH - 56) / ROWS;
    for (let r = 0; r < ROWS; r++) {
      for (let q = 0; q < COLS; q++) {
        const on = px[(r * COLS + q) * 4] > 110;
        const cx = x + 30 + (q + 0.5) * pitchX;
        const cy = y + 28 + (r + 0.5) * pitchY;
        a.fillStyle = on ? '#ffc35a' : '#1d1b17';
        a.beginPath();
        a.arc(cx, cy, pitchX * 0.36, 0, Math.PI * 2);
        a.fill();
        if (on) {
          e.fillStyle = '#ffc259';
          e.beginPath();
          e.arc(cx, cy, pitchX * 0.4, 0, Math.PI * 2);
          e.fill();
        }
      }
    }
    vms.push(uvOf(x, y, VW, VH));
  });

  // ── small verge signs ──
  const y0 = 3 * (GH + 8) + 2 * (VH + 8) + 8; // 1712
  const small = {} as Record<SmallSign, UvRect>;
  let x = 0;
  const cell = (name: SmallSign, w: number, h: number, draw: (c: Ctx, w: number, h: number) => void, wear = 0.6) => {
    cellW = w;
    a.save();
    a.translate(x, y0);
    draw(a, w, h);
    a.restore();
    if (wear > 0) {
      a.save();
      a.globalCompositeOperation = 'source-atop';
      weather(a, x, y0, w, h, 900 + x, wear);
      a.restore();
    }
    small[name] = uvOf(x, y0, w, h);
    x += w + 10;
  };
  const roundel = (n: string) => (c: Ctx, w: number, h: number) => {
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2 - 3, 0, Math.PI * 2);
    c.fillStyle = '#c4161c';
    c.fill();
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2 - 30, 0, Math.PI * 2);
    c.fillStyle = WHITE;
    c.fill();
    text(c, n, w / 2, h / 2 + 36, n.length > 2 ? 92 : 112, 'center', '#111');
  };
  cell('speed100', 256, 256, roundel('100'));
  cell('speed80', 256, 256, roundel('80'));
  cell('chevron', 204, 256, (c, w, h) => {
    c.fillStyle = '#c4161c';
    c.fillRect(0, 0, w, h);
    c.fillStyle = WHITE;
    for (let k = 0; k < 2; k++) {
      const ox = 36 + k * 62;
      c.beginPath();
      c.moveTo(ox, 40);
      c.lineTo(ox + 40, 40);
      c.lineTo(ox + 96, h / 2);
      c.lineTo(ox + 40, h - 40);
      c.lineTo(ox, h - 40);
      c.lineTo(ox + 56, h / 2);
      c.closePath();
      c.fill();
    }
    rr(c, 8, 8, w - 16, h - 16, 10);
    c.strokeStyle = WHITE;
    c.lineWidth = 7;
    c.stroke();
  });
  cell('sos', 256, 256, (c, w, h) => {
    c.fillStyle = BLUE;
    rr(c, 0, 0, w, h, 16);
    c.fill();
    rr(c, 10, 10, w - 20, h - 20, 12);
    c.strokeStyle = WHITE;
    c.lineWidth = 6;
    c.stroke();
    // Handset glyph.
    c.save();
    c.translate(w / 2, 92);
    c.rotate(-0.5);
    c.fillStyle = WHITE;
    rr(c, -56, -14, 112, 28, 12);
    c.fill();
    rr(c, -64, -14, 34, 44, 10);
    c.fill();
    rr(c, 30, -14, 34, 44, 10);
    c.fill();
    c.restore();
    text(c, st('sign.sos'), w / 2, 200, 76, 'center');
    text(c, st('sign.emergency'), w / 2, 238, 30, 'center', WHITE, '600');
  });
  cell('exitAdv', 384, 256, (c, w) => {
    c.fillStyle = GREEN;
    rr(c, 0, 0, w, 256, 14);
    c.fill();
    rr(c, 9, 9, w - 18, 238, 12);
    c.strokeStyle = WHITE;
    c.lineWidth = 6;
    c.stroke();
    // exit arrow centre w - 70, ~±45 wide
    const rm = w - 70 - 52 - 30;
    text(c, st('sign.exit14'), 30, 72, 52, 'left', WHITE, 'bold', w - 30 - 30);
    text(c, st('place.ashcombe'), 30, 150, 58, 'left', WHITE, '600', rm);
    text(c, st('sign.oneMile'), 30, 222, 48, 'left', WHITE, '600', rm);
    exitArrow(c, w - 70, 150, 100);
  });
  cell('eArea', 384, 256, (c, w) => {
    c.fillStyle = BLUE;
    rr(c, 0, 0, w, 256, 14);
    c.fill();
    rr(c, 9, 9, w - 18, 238, 12);
    c.strokeStyle = WHITE;
    c.lineWidth = 6;
    c.stroke();
    c.fillStyle = '#f08a1c';
    c.fillRect(28, 36, 112, 112);
    text(c, st('sign.sos'), 84, 112, 46, 'center', '#111', 'bold', 96);
    text(c, st('sign.area1'), 160, 84, 40, 'left', WHITE, 'bold', w - 160 - 24);
    text(c, st('sign.area2'), 160, 132, 40, 'left', WHITE, 'bold', w - 160 - 24);
    text(c, '400 m', w / 2, 222, 58, 'center');
  });

  // ── hectometre glyphs: blue plate with white border; 2 rows × 7 cells of 40 × 84 ──
  const glyph: Record<string, UvRect> = {};
  const chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', 'L', 'R', ' '];
  const gx0 = SIZE - 7 * 40 - 4;
  chars.forEach((ch, i) => {
    const gx = gx0 + (i % 7) * 40;
    const gy = y0 + Math.floor(i / 7) * 92;
    a.fillStyle = BLUE;
    a.fillRect(gx, gy, 40, 84);
    a.fillStyle = WHITE;
    a.fillRect(gx, gy + 4, 40, 5);
    a.fillRect(gx, gy + 75, 40, 5);
    if (ch === 'L') a.fillRect(gx + 18, gy + 4, 5, 76);
    else if (ch === 'R') a.fillRect(gx + 17, gy + 4, 5, 76);
    else if (ch !== ' ') text(a, ch, gx + 20, gy + 62, 54, 'center', WHITE, 'bold', 38);
    // Edge glyphs: the half outside the border is transparent (plate ends there).
    if (ch === 'L') a.clearRect(gx, gy, 18, 84);
    if (ch === 'R') a.clearRect(gx + 22, gy, 18, 84);
    glyph[ch] = { u0: (gx + 0.5) / SIZE, u1: (gx + 39.5) / SIZE, v1: 1 - (gy + 0.5) / SIZE, v0: 1 - (gy + 83.5) / SIZE };
  });

  return { guide, exitGuide, vms, small, glyph };
}

export function getSignAtlas(): SignAtlas {
  if (atlas) return atlas;
  const ca = document.createElement('canvas');
  const ce = document.createElement('canvas');
  ca.width = ca.height = ce.width = ce.height = SIZE;
  const a = ca.getContext('2d')!;
  const e = ce.getContext('2d')!;
  const layout = paintAtlas(a, e);
  const albedo = new CanvasTexture(ca);
  albedo.colorSpace = SRGBColorSpace;
  albedo.anisotropy = 8;
  albedo.minFilter = LinearMipmapLinearFilter;
  const emissive = new CanvasTexture(ce);
  emissive.colorSpace = SRGBColorSpace;
  emissive.anisotropy = 8;
  atlas = { albedo, emissive, emissiveScale: EMISSIVE_SCALE, ...layout };
  // Language switch: same layout, new legends, re-upload the textures.
  onLangChange(() => {
    paintAtlas(a, e);
    albedo.needsUpdate = true;
    emissive.needsUpdate = true;
  });
  return atlas;
}
