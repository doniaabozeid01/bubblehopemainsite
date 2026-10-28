/**
 * Brown Sugar Boba recipe scene — a 1080×1080 SVG where every style is a pure
 * function of time. `seek(t)` can jump to any moment; nothing is carried between
 * frames, so the same code drives the live section and the frame-by-frame render.
 *
 * The cup is a set of aligned studio photos, one per recipe stage. Each step
 * reveals the next photo through a feathered mask that follows the pour
 * (syrup drips down, milk rises, the torch sweeps across), while real gloved
 * hands, pearls, ice and sugar move on top.
 */

export const BPM = 100;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const DURATION = 24;
export const SIZE = 1080;
export const STEP_COUNT = 7;
export const STEP = { syrup: 0, pearls: 1, ice: 2, milk: 3, foam: 4, sugar: 5, torch: 6 } as const;
export const STEP_TARGETS = [30, 60, 4, 200, 50, 10, 10];

export const stepStart = (i: number) => (i + 1) * BAR;
export const FINISH_AT = stepStart(STEP_COUNT);
export const CHIPS_AT = FINISH_AT + BEAT * 3;
export const OUTRO_AT = FINISH_AT + BEAT * 4;

/* Beat offsets inside a step bar: hand lands on beat 1, pour runs beat 2 → beat 4. */
export const POUR_ON = BEAT;
export const POUR_OFF = BEAT * 3;
const FILL_FROM = POUR_ON + 0.12;

export interface RecipeStepLabel {
  measure: string;
  name: string;
  sub: string;
  unit: string;
  short: string;
}

export interface RecipeSceneLabels {
  title: string;
  subtitle: string;
  stepOf: string;
  signoff: string;
  milkTag: string;
  steps: RecipeStepLabel[];
}

/* ---------- math ---------- */

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const expOut = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
const expIn = (p: number) => (p <= 0 ? 0 : Math.pow(2, 10 * (p - 1)));
const expInOut = (p: number) =>
  p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2;
const cubicInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/** Damped spring 0 → 1 that starts moving at t0. */
const spring = (t: number, t0: number, freq = 14, damp = 9) => {
  const u = t - t0;
  return u <= 0 ? 0 : 1 - Math.exp(-damp * u) * Math.cos(freq * u);
};

/** Rebound after an impact: 0 at impact, bounces, decays back to 0. */
const hop = (t: number, t0: number, amp: number, decay = 10, freq = 22) => {
  const u = t - t0;
  return u <= 0 ? 0 : amp * Math.exp(-decay * u) * Math.abs(Math.sin(freq * u));
};

const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
};

const n2 = (v: number) => Math.round(v * 100) / 100;

/* ---------- palette ---------- */

const NAVY = '#243a63';
const ORANGE = '#f47524';
const CREAM = '#fffbf5';
const FUTURE = '#e2d6c6';
const FUTURE_TEXT = '#c2b6a6';
const MUTED = '#8a8f9c';
const SYRUP = '#6b3312';
const MILK_STREAM = '#fbf6ee';
const FOAM_STREAM = '#e9c58f';
const LOGO_SRC = 'assets/Group%2073.png';
const ASSET_DIR = 'assets/recipe/';
const SPLASH_COUNT = 8;
const TITLE_SIDE_X = 836;

const CUP_PHOTOS = [
  'cup-0-empty',
  'cup-1-syrup',
  'cup-2-pearls',
  'cup-3-ice',
  'cup-4-milk',
  'cup-5-foam',
  'cup-6-sugar',
  'cup-7-torched',
];

/** Photos the scene draws; the frame renderer waits for them before seeking. */
export const RENDER_ASSETS = [
  ...CUP_PHOTOS,
  'glove-syrup',
  'glove-pearls',
  'glove-pearls-empty',
  'glove-ice',
  'glove-ice-empty',
  'glove-milk',
  'glove-foam',
  'glove-sugar',
  'glove-sugar-empty',
  'glove-torch',
  'ice-cube',
  'boba-pearl',
].map((n) => `${ASSET_DIR}${n}.webp`);

/* ---------- cup geometry, measured on the photos (scene px) ---------- */

const CX = 392;
const RIM_Y = 276;
const RIM_HALF = 211;
const BASE_Y = 918;
const BASE_HALF = 129;
const IN_TOP = 300;
const IN_BOT = 900;
const MILK_TOP = 292;
const FOAM_TOP = 282;
const FOAM_BOTTOM = 402;
const FOAM_RY = 22;
const CAM_PIVOT = { x: CX, y: 600 };

const halfAt = (y: number) => lerp(BASE_HALF, RIM_HALF, (BASE_Y - y) / (BASE_Y - RIM_Y));

const CARD = { x: 664, y: 362, w: 380, h: 300 };
const STEPPER_Y = 1000;

/* ---------- timeline ---------- */

const fillP = (step: number, t: number) => {
  const s = stepStart(step);
  return cubicInOut(seg(t, s + FILL_FROM, s + POUR_OFF + 0.05));
};

const sweep = (step: number, t: number) => seg(t, stepStart(step) + POUR_ON, stepStart(step) + POUR_OFF);

const milkLevel = (t: number) => lerp(IN_BOT, MILK_TOP, fillP(STEP.milk, t));

const SYRUP_X0 = CX - 150;
const SYRUP_X1 = CX + 150;
const TORCH_X0 = CX - 180;
const TORCH_X1 = CX + 180;
const SUGAR_X0 = CX - 140;
const SUGAR_X1 = CX + 140;

/* pearls */

const PEARL_R = 15;
const PEARL_COUNT = 22;
const PEARL_G = 5200;
const PEARL_MOUTH = { x: CX - 14, y: 222 };

interface PearlSpec {
  x0: number;
  y0: number;
  tx: number;
  ty: number;
  release: number;
  fall: number;
}

const PEARLS: PearlSpec[] = (() => {
  const rnd = rng(11);
  const s0 = stepStart(STEP.pearls);
  return Array.from({ length: PEARL_COUNT }, (_, i) => {
    const ty = 880 - (i / PEARL_COUNT) * 150 + (rnd() - 0.5) * 20;
    const tx = CX + (rnd() * 2 - 1) * (halfAt(ty) - 40);
    const x0 = PEARL_MOUTH.x + (rnd() - 0.5) * 18;
    const y0 = PEARL_MOUTH.y + rnd() * 6;
    return {
      x0,
      y0,
      tx,
      ty,
      release: s0 + POUR_ON + 0.06 + i * 0.032,
      fall: Math.sqrt((2 * (ty - y0)) / PEARL_G),
    };
  });
})();

/* ice */

interface IceSpec {
  x: number;
  y: number;
  rot: number;
  size: number;
  impact: number;
  x0: number;
  rot0: number;
}

const ICE_FALL = 0.32;
const ICE_MOUTH = { x: CX - 6, y: 220 };
const ICE: IceSpec[] = [
  { x: CX - 48, y: 700, rot: -9, size: 112, dr: 38 },
  { x: CX + 50, y: 690, rot: 11, size: 108, dr: -44 },
  { x: CX - 30, y: 580, rot: 14, size: 112, dr: -36 },
  { x: CX + 34, y: 470, rot: -7, size: 108, dr: 48 },
].map((c, k) => ({
  ...c,
  impact: stepStart(STEP.ice) + POUR_ON + k * (BEAT / 2),
  x0: ICE_MOUTH.x + (k - 1.5) * 10,
  rot0: c.rot + c.dr,
}));

/* sugar grains */

const SUGAR_MOUTH_Y = 232;
const SUGAR_G = 3400;

interface GrainSpec {
  x0: number;
  release: number;
  tx: number;
  ty: number;
  fall: number;
  r: number;
}

const GRAINS: GrainSpec[] = (() => {
  const rnd = rng(77);
  const s0 = stepStart(STEP.sugar);
  const rx = RIM_HALF - 40;
  return Array.from({ length: 48 }, (_, i) => {
    const k = i / 47;
    const release = s0 + POUR_ON + 0.05 + k * (POUR_OFF - POUR_ON - 0.2);
    const x0 = lerp(SUGAR_X0, SUGAR_X1, seg(release, s0 + POUR_ON, s0 + POUR_OFF)) - 14 + (rnd() - 0.5) * 12;
    const tx = Math.max(CX - rx, Math.min(CX + rx, x0 + (rnd() - 0.5) * 40));
    const span = Math.sqrt(Math.max(0, 1 - Math.pow((tx - CX) / (rx + 20), 2)));
    const ty = FOAM_TOP + (rnd() * 2 - 1) * FOAM_RY * 0.6 * span;
    return { x0, release, tx, ty, fall: Math.sqrt((2 * (ty - SUGAR_MOUTH_Y)) / SUGAR_G), r: 2.2 + rnd() * 1.8 };
  });
})();

/* ---------- photo reveals ---------- */

interface Reveal {
  /** Gradient endpoints in scene px: fully visible at `from`, hidden past `to`. */
  from: [number, number];
  to: [number, number];
}

/** How far the photo of stage `step + 1` has been revealed over stage `step`. */
const revealOf = (step: number, t: number): Reveal | 'none' | 'full' => {
  const s = stepStart(step);
  const v = (yFrom: number, yTo: number): Reveal => ({ from: [0, yFrom], to: [0, yTo] });
  switch (step) {
    case STEP.syrup: {
      const p = expOut(seg(t, s + POUR_ON, s + BAR + 0.4));
      if (p <= 0) return 'none';
      if (p >= 1) return 'full';
      const y = lerp(250, 960, p);
      return v(y, y + 140);
    }
    case STEP.pearls: {
      const p = clamp01(PEARLS.filter((q) => t >= q.release + q.fall).length / PEARL_COUNT);
      const eased = expOut(seg(t, PEARLS[0].release + PEARLS[0].fall, PEARLS[PEARL_COUNT - 1].release + PEARLS[PEARL_COUNT - 1].fall + 0.3));
      const q = Math.max(p, eased);
      if (q <= 0) return 'none';
      if (q >= 1) return 'full';
      const y = lerp(960, 640, q);
      return v(y, y - 60);
    }
    case STEP.ice: {
      let p = 0;
      ICE.forEach((c) => (p += 0.25 * expOut(seg(t, c.impact, c.impact + 0.25))));
      if (p <= 0) return 'none';
      if (p >= 0.999) return 'full';
      const y = lerp(800, 380, p);
      return v(y, y - 80);
    }
    case STEP.milk: {
      const p = fillP(STEP.milk, t);
      if (p <= 0) return 'none';
      if (p >= 1) return 'full';
      const y = milkLevel(t);
      return v(y + 8, y - 22);
    }
    case STEP.foam: {
      const p = fillP(STEP.foam, t);
      if (p <= 0) return 'none';
      if (p >= 1) return 'full';
      const y = lerp(230, FOAM_BOTTOM + 20, p);
      return v(y - 30, y);
    }
    case STEP.sugar: {
      const p = GRAINS.filter((g) => t >= g.release + g.fall).length / GRAINS.length;
      if (p <= 0) return 'none';
      if (p >= 1) return 'full';
      const x = lerp(SUGAR_X0 - 60, SUGAR_X1 + 60, p);
      return { from: [x - 40, 0], to: [x + 40, 0] };
    }
    case STEP.torch: {
      const p = sweep(STEP.torch, t);
      if (p <= 0) return 'none';
      if (p >= 1) return 'full';
      const x = lerp(TORCH_X0, TORCH_X1, p);
      return { from: [x - 50, 0], to: [x + 30, 0] };
    }
    default:
      return 'none';
  }
};

export interface SoundCue {
  kind: 'pour' | 'plop' | 'clink' | 'sprinkle' | 'hiss' | 'chime' | 'pop' | 'tick';
  t: number;
  end?: number;
  from?: number;
  to?: number;
  gain?: number;
}

/** Every audible moment, taken from the same timeline the visuals use. */
export function soundCues(): SoundCue[] {
  const cues: SoundCue[] = [];
  const pour = (step: number, from: number, to: number, gain: number) => {
    const s = stepStart(step);
    cues.push({ kind: 'pour', t: s + POUR_ON, end: s + POUR_OFF + 0.08, from, to, gain });
  };
  cues.push({ kind: 'pop', t: 0.05 });
  cues.push({ kind: 'clink', t: 1.3, gain: 0.4 });
  pour(STEP.syrup, 420, 760, 0.3);
  PEARLS.forEach((p) => cues.push({ kind: 'plop', t: p.release + p.fall }));
  ICE.forEach((c) => cues.push({ kind: 'clink', t: c.impact, gain: 1 }));
  pour(STEP.milk, 620, 1500, 0.42);
  pour(STEP.foam, 380, 900, 0.3);
  GRAINS.forEach((g, i) => {
    if (i % 3 === 0) cues.push({ kind: 'sprinkle', t: g.release + g.fall });
  });
  const ts = stepStart(STEP.torch);
  cues.push({ kind: 'hiss', t: ts + POUR_ON - 0.1, end: ts + POUR_OFF + 0.1 });
  for (let i = 0; i < STEP_COUNT; i++) cues.push({ kind: 'tick', t: stepStart(i) + POUR_OFF });
  cues.push({ kind: 'chime', t: CHIPS_AT });
  cues.push({ kind: 'chime', t: OUTRO_AT + 0.3, gain: 1.2 });
  return cues;
}

/* ---------- hands ---------- */

interface Pose {
  x: number;
  y: number;
  a: number;
}

interface Stream {
  mx: number;
  my: number;
  lx: number;
  ly: number;
  w: number;
  color: string;
  head: number;
  tail: number;
  splash: boolean;
}

/** A real gloved hand photo; `px` is the pouring point in the 1024px source image. */
interface ToolSpec {
  step: number;
  img: string;
  empty?: string;
  px: { x: number; y: number };
  rest: number;
  pour: number;
  mouth: (t: number) => { x: number; y: number };
  stream?: { w: number; color: string; dx: number };
}

const HAND_SIZE = 600;
const HAND_SCALE = HAND_SIZE / 1024;
const FROM = { x: -520, y: -320 };
const TORCH_AXIS = 30;
const FLAME_LEN = 92;

const TOOLS: ToolSpec[] = [
  {
    step: STEP.syrup,
    img: 'glove-syrup',
    px: { x: 835, y: 652 },
    rest: -24,
    pour: 10,
    mouth: (t) => ({ x: lerp(SYRUP_X0, SYRUP_X1, sweep(STEP.syrup, t)), y: 250 }),
    stream: { w: 8, color: SYRUP, dx: 3 },
  },
  {
    step: STEP.pearls,
    img: 'glove-pearls',
    empty: 'glove-pearls-empty',
    px: { x: 800, y: 575 },
    rest: -12,
    pour: 34,
    mouth: () => PEARL_MOUTH,
  },
  {
    step: STEP.ice,
    img: 'glove-ice',
    empty: 'glove-ice-empty',
    px: { x: 895, y: 715 },
    rest: -14,
    pour: 26,
    mouth: () => ICE_MOUTH,
  },
  {
    step: STEP.milk,
    img: 'glove-milk',
    px: { x: 832, y: 540 },
    rest: -18,
    pour: 16,
    mouth: () => ({ x: CX - 10, y: 214 }),
    stream: { w: 15, color: MILK_STREAM, dx: 8 },
  },
  {
    step: STEP.foam,
    img: 'glove-foam',
    px: { x: 745, y: 612 },
    rest: -18,
    pour: 18,
    mouth: () => ({ x: CX - 8, y: 210 }),
    stream: { w: 20, color: FOAM_STREAM, dx: 6 },
  },
  {
    step: STEP.sugar,
    img: 'glove-sugar',
    empty: 'glove-sugar-empty',
    px: { x: 895, y: 522 },
    rest: -6,
    pour: 22,
    mouth: (t) => ({ x: lerp(SUGAR_X0, SUGAR_X1, sweep(STEP.sugar, t)), y: SUGAR_MOUTH_Y }),
  },
  {
    step: STEP.torch,
    img: 'glove-torch',
    px: { x: 785, y: 548 },
    rest: -12,
    pour: 16,
    mouth: (t) => {
      const a = ((16 + TORCH_AXIS) * Math.PI) / 180;
      return {
        x: lerp(TORCH_X0, TORCH_X1, sweep(STEP.torch, t)) - FLAME_LEN * Math.cos(a),
        y: FOAM_TOP - 2 - FLAME_LEN * Math.sin(a),
      };
    },
  },
];

const toolPose = (tool: ToolSpec, t: number): Pose | null => {
  const s = stepStart(tool.step);
  const u = t - s;
  if (u < 0 || u > BAR) return null;
  const enter = spring(t, s, 10, 8.5);
  const leave = expIn(seg(u, 1.98, 2.38));
  const m = tool.mouth(t);
  const tilt = clamp01(spring(t, s + 0.4, 13, 9.5)) - expOut(seg(u, POUR_OFF, POUR_OFF + 0.22));
  return {
    x: m.x + FROM.x * (1 - enter) + FROM.x * 1.25 * leave,
    y: m.y + FROM.y * (1 - enter) + FROM.y * 1.3 * leave,
    a: tool.rest + (tool.pour - tool.rest) * Math.max(0, tilt),
  };
};

const icePose = (c: IceSpec, t: number): Pose | null => {
  const start = c.impact - ICE_FALL;
  if (t < start) return null;
  if (t < c.impact) {
    const k = (t - start) / ICE_FALL;
    return { x: lerp(c.x0, c.x, k), y: lerp(ICE_MOUTH.y, c.y, k * k), a: lerp(c.rot0, c.rot, k) };
  }
  const u = t - c.impact;
  return { x: c.x, y: c.y - hop(t, c.impact, 14, 9, 20), a: c.rot + 7 * Math.exp(-8 * u) * Math.cos(18 * u) };
};

const BLUR_K = 0.003;
const BLUR_MAX = 12;
const blurOf = (a: Pose | null, b: Pose | null) => {
  if (!a || !b) return [0, 0];
  const dt = 1 / 240;
  const vx = Math.abs(a.x - b.x) / dt;
  const vy = Math.abs(a.y - b.y) / dt;
  return [Math.min(BLUR_MAX, vx * BLUR_K), Math.min(BLUR_MAX, vy * BLUR_K)];
};

/* ---------- markup ---------- */

const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FONT_UI = `Nunito, 'Baloo 2', system-ui, sans-serif`;
const FONT_DISPLAY = `'Baloo 2', Nunito, system-ui, sans-serif`;

const cupOutline =
  `M ${CX - RIM_HALF} ${RIM_Y} L ${CX - BASE_HALF} ${BASE_Y - 24} Q ${CX - BASE_HALF + 4} ${BASE_Y + 6} ${CX} ${BASE_Y + 8} ` +
  `Q ${CX + BASE_HALF - 4} ${BASE_Y + 6} ${CX + BASE_HALF} ${BASE_Y - 24} L ${CX + RIM_HALF} ${RIM_Y} Z`;

export class RecipeScene {
  private readonly uid = `rm${Math.random().toString(36).slice(2, 8)}`;
  private els: Record<string, SVGElement> = {};
  private pearlEls: SVGElement[] = [];
  private grainEls: SVGElement[] = [];
  private photoEls: SVGElement[] = [];
  private lastT = 0;

  constructor(
    private host: HTMLElement,
    private labels: RecipeSceneLabels,
    private rtl = false
  ) {
    this.build();
  }

  get time(): number {
    return this.lastT;
  }

  setLabels(labels: RecipeSceneLabels, rtl: boolean): void {
    this.labels = labels;
    this.rtl = rtl;
    this.build();
    this.seek(this.lastT);
  }

  destroy(): void {
    this.host.innerHTML = '';
    this.els = {};
    this.pearlEls = [];
    this.grainEls = [];
    this.photoEls = [];
  }

  private build(): void {
    this.host.innerHTML = this.markup();
    this.els = {};
    this.host.querySelectorAll<SVGElement>('[data-k]').forEach((el) => {
      this.els[el.getAttribute('data-k') as string] = el;
    });
    const all = (sel: string) => Array.from(this.host.querySelectorAll<SVGElement>(sel));
    this.pearlEls = all('[data-pearl]');
    this.grainEls = all('[data-grain]');
    this.photoEls = all('[data-photo]');
  }

  private markup(): string {
    const f = (k: string) => `${this.uid}-${k}`;
    const url = (k: string) => `url(#${f(k)})`;
    const L = this.labels;
    const rtl = this.rtl;
    const dir = rtl ? 'rtl' : 'ltr';

    const blurFilter = (k: string) =>
      `<filter id="${f(k)}" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">` +
      `<feGaussianBlur data-k="${k}-sd" stdDeviation="0 0"/></filter>`;

    const defs =
      `<clipPath id="${f('cup')}"><path d="${cupOutline}"/></clipPath>` +
      `<linearGradient id="${f('reveal')}" data-k="revealGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>` +
      `<mask id="${f('revealMask')}" maskUnits="userSpaceOnUse" x="0" y="0" width="${SIZE}" height="${SIZE}">` +
      `<rect width="${SIZE}" height="${SIZE}" fill="${url('reveal')}"/></mask>` +
      `<linearGradient id="${f('behindWall')}" gradientUnits="userSpaceOnUse" x1="0" y1="${RIM_Y + 18}" x2="0" y2="${RIM_Y + 60}">` +
      `<stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#6a6a6a"/></linearGradient>` +
      `<mask id="${f('streamMask')}" maskUnits="userSpaceOnUse" x="0" y="0" width="${SIZE}" height="${SIZE}">` +
      `<rect width="${SIZE}" height="${SIZE}" fill="${url('behindWall')}"/></mask>` +
      `<linearGradient id="${f('accent')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff9a3c"/><stop offset="1" stop-color="${ORANGE}"/></linearGradient>` +
      `<filter id="${f('lift')}" x="-20%" y="-30%" width="140%" height="170%"><feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#5b3a22" flood-opacity=".13"/></filter>` +
      `<filter id="${f('toolShadow')}" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="10" dy="22" stdDeviation="14" flood-color="#5b3a22" flood-opacity=".2"/></filter>` +
      `<filter id="${f('sheenBlur')}" x="-100%" y="-10%" width="300%" height="120%"><feGaussianBlur stdDeviation="18 0"/></filter>` +
      `<filter id="${f('print')}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 -4 0 4 -0.6"/></filter>` +
      ['tool', 'ice0', 'ice1', 'ice2', 'ice3'].map(blurFilter).join('');

    const asset = (name: string) => `${ASSET_DIR}${name}.webp`;
    const img = (name: string, x: number, y: number, w: number, h: number, extra = '') =>
      `<image href="${asset(name)}" xlink:href="${asset(name)}" x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" preserveAspectRatio="none" ${extra}/>`;

    const photos = CUP_PHOTOS.map((name, i) =>
      img(name, 0, 0, SIZE, SIZE, `data-photo="${i}" style="display:${i === 0 ? '' : 'none'}"`)
    ).join('');

    const pearl = (i: number) =>
      `<g data-pearl="${i}" style="display:none">${img('boba-pearl', -PEARL_R - 1, -PEARL_R - 1, PEARL_R * 2 + 2, PEARL_R * 2 + 2)}</g>`;

    const ice = (k: number) => {
      const h = ICE[k].size / 2;
      return `<g data-k="icew${k}" style="display:none"><g data-k="ice${k}">${img('ice-cube', -h, -h, h * 2, h * 2, 'opacity=".92"')}</g></g>`;
    };

    const flame =
      `<g data-k="flame" opacity="0">` +
      `<path d="M 0 -13 Q 50 -12 ${FLAME_LEN} 0 Q 50 12 0 13 Z" fill="#4f9dff" opacity=".7"/>` +
      `<path d="M 0 -8 Q 32 -7 ${FLAME_LEN * 0.62} 0 Q 32 7 0 8 Z" fill="#cfe9ff" opacity=".95"/>` +
      `<path d="M 0 -3 Q 16 -2 ${FLAME_LEN * 0.3} 0 Q 16 2 0 3 Z" fill="#ffffff"/>` +
      `</g>`;

    const toolMarkup = TOOLS.map((tool, i) => {
      const x = -tool.px.x * HAND_SCALE;
      const y = -tool.px.y * HAND_SCALE;
      const full = img(tool.img, x, y, HAND_SIZE, HAND_SIZE, tool.empty ? `data-k="full${i}"` : '');
      const empty = tool.empty ? img(tool.empty, x, y, HAND_SIZE, HAND_SIZE, `data-k="empty${i}" opacity="0"`) : '';
      const extra = tool.step === STEP.torch ? `<g transform="rotate(${TORCH_AXIS})">${flame}</g>` : '';
      return `<g data-k="toolw${i}" style="display:none"><g data-k="tool${i}">${empty}${full}${extra}</g></g>`;
    }).join('');

    /* card */
    const tx = rtl ? CARD.x + CARD.w - 34 : CARD.x + 34;
    const barX0 = rtl ? CARD.x + 150 : CARD.x + 34;
    const barX1 = rtl ? CARD.x + CARD.w - 34 : CARD.x + CARD.w - 150;
    const counterX = rtl ? CARD.x + 34 : CARD.x + CARD.w - 34;
    const measure = (m: string, unitSize = 54) => {
      const match = /^([\d.,]+)\s*(.*)$/.exec(m.trim());
      if (!match) return `<tspan fill="${NAVY}">${esc(m)}</tspan>`;
      const unit = match[2]
        ? `<tspan fill="${ORANGE}" font-size="${unitSize}" dx="${rtl ? 0 : 8}">${esc(match[2])}</tspan>`
        : '';
      return rtl
        ? `<tspan fill="${NAVY}">${esc(match[1])}</tspan> ${unit}`
        : `<tspan fill="${NAVY}">${esc(match[1])}</tspan>${unit}`;
    };
    const cards = L.steps
      .map((s, i) => {
        const stepOf = L.stepOf.replace('{{n}}', String(i + 1)).replace('{{total}}', String(STEP_COUNT));
        return (
          `<g data-k="card${i}" opacity="0">` +
          `<text x="${tx}" y="${CARD.y + 58}" direction="${dir}" text-anchor="start" font-family="${FONT_UI}" font-weight="800" font-size="18" letter-spacing="${rtl ? 0 : 3}" fill="${MUTED}">${esc(stepOf)}</text>` +
          `<text x="${tx}" y="${CARD.y + 150}" direction="${dir}" text-anchor="start" font-family="${FONT_DISPLAY}" font-weight="800" font-size="92" letter-spacing="${rtl ? 0 : -1.5}">${measure(s.measure)}</text>` +
          `<text x="${tx}" y="${CARD.y + 196}" direction="${dir}" text-anchor="start" font-family="${FONT_UI}" font-weight="800" font-size="30" letter-spacing="${rtl ? 0 : 0.6}" fill="${NAVY}">${esc(s.name)}</text>` +
          `<text x="${tx}" y="${CARD.y + 230}" direction="${dir}" text-anchor="start" font-family="${FONT_UI}" font-weight="600" font-size="21" fill="${MUTED}">${esc(s.sub)}</text>` +
          `<rect x="${barX0}" y="${CARD.y + 258}" width="${barX1 - barX0}" height="8" rx="4" fill="#f2ebe2"/>` +
          `<rect data-k="cardbar${i}" x="${barX0}" y="${CARD.y + 258}" width="0" height="8" rx="4" fill="${url('accent')}"/>` +
          `<text data-k="cardnum${i}" x="${counterX}" y="${CARD.y + 268}" direction="ltr" text-anchor="${rtl ? 'start' : 'end'}" font-family="${FONT_UI}" font-weight="700" font-size="18" fill="${MUTED}"></text>` +
          `</g>`
        );
      })
      .join('');

    /* stepper */
    const nodeX = (i: number) => (rtl ? 960 - i * 140 : 120 + i * 140);
    const lines = Array.from({ length: STEP_COUNT - 1 }, (_, i) => {
      const a = nodeX(i) + (rtl ? -20 : 20);
      const b = nodeX(i + 1) + (rtl ? 20 : -20);
      return (
        `<line x1="${a}" y1="${STEPPER_Y}" x2="${b}" y2="${STEPPER_Y}" stroke="#e7dccd" stroke-width="3" stroke-linecap="round"/>` +
        `<line data-k="sl${i}" x1="${a}" y1="${STEPPER_Y}" x2="${a}" y2="${STEPPER_Y}" stroke="${ORANGE}" stroke-width="3" stroke-linecap="round" opacity="0" data-a="${a}" data-b="${b}"/>`
      );
    }).join('');
    const nodes = L.steps
      .map(
        (s, i) =>
          `<g data-k="sn${i}" transform="translate(${nodeX(i)} ${STEPPER_Y})">` +
          `<circle data-k="snc${i}" r="15" fill="#fff" stroke="${FUTURE}" stroke-width="2"/>` +
          `<text data-k="snn${i}" y="5.5" text-anchor="middle" font-family="${FONT_UI}" font-weight="800" font-size="15" fill="${FUTURE_TEXT}">${i + 1}</text>` +
          `<path data-k="snk${i}" d="M -6 0.5 L -2 4.5 L 6.5 -4.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0"/>` +
          `</g>` +
          `<text data-k="snl${i}" x="${nodeX(i)}" y="${STEPPER_Y + 44}" text-anchor="middle" direction="${dir}" font-family="${FONT_UI}" font-weight="800" font-size="17" letter-spacing="${rtl ? 0 : 1.6}" fill="${FUTURE_TEXT}">${esc(s.short)}</text>`
      )
      .join('');

    /* finish: recipe summary down the right column */
    const chipSteps = [STEP.syrup, STEP.pearls, STEP.ice, STEP.milk, STEP.foam];
    const rowH = 82;
    const rowGap = 14;
    const listY = 300;
    const chips = chipSteps
      .map((stepIdx, k) => {
        const s = L.steps[stepIdx];
        const y = listY + k * (rowH + rowGap);
        const a = rtl ? CARD.x + CARD.w - 30 : CARD.x + 30;
        const b = rtl ? CARD.x + 30 : CARD.x + CARD.w - 30;
        return (
          `<g data-k="chip${stepIdx}" opacity="0">` +
          `<rect x="${CARD.x}" y="${y}" width="${CARD.w}" height="${rowH}" rx="22" fill="#fff" filter="${url('lift')}"/>` +
          `<text x="${a}" y="${y + 54}" direction="${dir}" text-anchor="start" font-family="${FONT_DISPLAY}" font-weight="800" font-size="40">${measure(s?.measure ?? '', 26)}</text>` +
          `<text x="${b}" y="${y + 49}" direction="${dir}" text-anchor="end" font-family="${FONT_UI}" font-weight="800" font-size="17" letter-spacing="${rtl ? 0 : 1.8}" fill="${MUTED}">${esc(s?.short ?? '')}</text>` +
          `</g>`
        );
      })
      .join('');
    const signY = listY + chipSteps.length * (rowH + rowGap) + 10;

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${SIZE} ${SIZE}" width="100%" height="100%" role="img" aria-label="${esc(L.title)}" style="display:block">` +
      `<defs>${defs}</defs>` +
      `<rect width="${SIZE}" height="${SIZE}" fill="${CREAM}"/>` +
      `<g data-k="cam">` +
      `<g data-k="glass" opacity="0">` +
      photos +
      `<g data-k="streams" mask="${url('streamMask')}">` +
      `<path data-k="streamS" d="M0 0" pathLength="1" fill="none" stroke="#000" stroke-opacity=".1" stroke-linecap="round" opacity="0"/>` +
      `<path data-k="streamI" d="M0 0" pathLength="1" fill="none" stroke-linecap="round" opacity="0"/>` +
      `<path data-k="streamH" d="M0 0" pathLength="1" fill="none" stroke="#fff" stroke-linecap="round" opacity="0"/>` +
      Array.from({ length: SPLASH_COUNT }, (_, k) => `<circle data-k="splash${k}" r="0" opacity="0"/>`).join('') +
      `</g>` +
      `<g>${PEARLS.map((_, i) => pearl(i)).join('')}</g>` +
      `<g>${ICE.map((_, k) => ice(k)).join('')}</g>` +
      `<g>${GRAINS.map((g, i) => `<circle data-grain="${i}" r="${n2(g.r)}" fill="${i % 3 ? '#b8672a' : '#e0a258'}" style="display:none"/>`).join('')}</g>` +
      `<image href="${LOGO_SRC}" xlink:href="${LOGO_SRC}" x="${CX - 100}" y="470" width="200" height="120" preserveAspectRatio="xMidYMid meet" filter="${url('print')}" opacity=".94"/>` +
      `<g clip-path="${url('cup')}"><rect data-k="sheen" x="-60" y="-560" width="120" height="1120" fill="#fff" opacity="0" filter="${url('sheenBlur')}"/></g>` +
      `</g>` +
      `<g data-k="toolsLayer" filter="${url('toolShadow')}">${toolMarkup}</g>` +
      `</g>` +
      `<g data-k="title" opacity="0">` +
      `<text x="540" y="100" text-anchor="middle" direction="${dir}" font-family="${FONT_DISPLAY}" font-weight="800" font-size="66" letter-spacing="${rtl ? 0 : -1}" fill="${NAVY}">${esc(L.title)}</text>` +
      `</g>` +
      `<text data-k="subtitle" x="540" y="146" text-anchor="middle" direction="${dir}" font-family="${FONT_UI}" font-weight="800" font-size="18" letter-spacing="${rtl ? 0 : 3.2}" fill="${ORANGE}" opacity="0">${esc(rtl ? L.subtitle : L.subtitle.toUpperCase())}</text>` +
      `<g data-k="cardFrame" opacity="0">` +
      `<rect x="${CARD.x}" y="${CARD.y}" width="${CARD.w}" height="${CARD.h}" rx="30" fill="#fff" filter="${url('lift')}"/>` +
      `<rect x="${rtl ? CARD.x + CARD.w - 6 : CARD.x}" y="${CARD.y + 40}" width="6" height="${CARD.h - 80}" rx="3" fill="${ORANGE}"/>` +
      cards +
      `</g>` +
      `<g data-k="stepper" opacity="0">${lines}${nodes}</g>` +
      chips +
      `<g data-k="signoff" opacity="0">` +
      `<rect x="${CARD.x}" y="${signY}" width="${CARD.w}" height="80" rx="40" fill="${url('accent')}" filter="${url('lift')}"/>` +
      `<text x="${CARD.x + CARD.w / 2}" y="${signY + 51}" text-anchor="middle" direction="${dir}" font-family="${FONT_DISPLAY}" font-weight="800" font-size="28" fill="#fff">${esc(L.signoff)}</text>` +
      `</g>` +
      `<rect data-k="fade" width="${SIZE}" height="${SIZE}" fill="${CREAM}" opacity="0" pointer-events="none"/>` +
      `</svg>`
    );
  }

  private set(key: string, name: string, value: string | number): void {
    const el = this.els[key];
    if (el) el.setAttribute(name, String(value));
  }

  private show(el: SVGElement | undefined, on: boolean): void {
    if (!el) return;
    const want = on ? '' : 'none';
    if (el.style.display !== want) el.style.display = want;
  }

  private applyBlur(wrapKey: string, filterKey: string, b: number[]): void {
    const wrap = this.els[wrapKey];
    if (!wrap) return;
    const on = b[0] > 0.35 || b[1] > 0.35;
    if (on) {
      this.set(`${filterKey}-sd`, 'stdDeviation', `${n2(b[0])} ${n2(b[1])}`);
      wrap.setAttribute('filter', `url(#${this.uid}-${filterKey})`);
    } else if (wrap.hasAttribute('filter')) {
      wrap.removeAttribute('filter');
    }
  }

  /** Base photo plus the next stage fading in through the reveal mask. */
  private seekPhotos(t: number): void {
    let base = 0;
    let next = -1;
    let reveal: Reveal | null = null;
    for (let step = 0; step < STEP_COUNT; step++) {
      const r = revealOf(step, t);
      if (r === 'full') {
        base = step + 1;
        continue;
      }
      if (r !== 'none') {
        next = step + 1;
        reveal = r;
      }
      break;
    }
    const maskUrl = `url(#${this.uid}-revealMask)`;
    this.photoEls.forEach((el, i) => {
      const visible = i === base || i === next;
      this.show(el, visible);
      if (i === next) {
        if (el.getAttribute('mask') !== maskUrl) el.setAttribute('mask', maskUrl);
      } else if (el.hasAttribute('mask')) {
        el.removeAttribute('mask');
      }
    });
    if (reveal) {
      this.set('revealGrad', 'x1', n2(reveal.from[0]));
      this.set('revealGrad', 'y1', n2(reveal.from[1]));
      this.set('revealGrad', 'x2', n2(reveal.to[0]));
      this.set('revealGrad', 'y2', n2(reveal.to[1]));
    }
  }

  seek(time: number): void {
    const t = Math.min(DURATION, Math.max(0, time));
    this.lastT = t;
    const L = this.labels;
    const rtl = this.rtl;

    /* camera: a slow push-in on the finished cup */
    const camIn = expInOut(seg(t, FINISH_AT, FINISH_AT + 2.2));
    const camS = 1 + 0.06 * camIn + 0.03 * cubicInOut(seg(t, FINISH_AT + 2.2, DURATION));
    this.set(
      'cam',
      'transform',
      `translate(${CAM_PIVOT.x} ${CAM_PIVOT.y}) scale(${n2(camS * 1000) / 1000}) translate(${-CAM_PIVOT.x} ${-CAM_PIVOT.y})`
    );

    /* intro: title pops, then lifts into the top-right corner (hands work top-left) */
    const pop = spring(t, 0.05, 11, 9);
    const lift = spring(t, BEAT * 2, 9, 8.5);
    const titleX = lerp(540, TITLE_SIDE_X, lift);
    const titleS = lerp(1.3, 0.8, lift) * pop;
    const tdy = lerp(430, 0, lift);
    const titleT = (dy: number) =>
      `translate(${n2(titleX)} ${n2(104 + tdy + dy)}) scale(${n2(titleS * 1000) / 1000}) translate(-540 -104)`;
    this.set('title', 'opacity', n2(seg(t, 0.05, 0.2)));
    this.set('title', 'transform', titleT(0));
    const subIn = spring(t, BEAT * 2.5, 11, 9);
    this.set('subtitle', 'opacity', n2(seg(t, BEAT * 2.5, BEAT * 2.5 + 0.3)));
    this.set('subtitle', 'transform', titleT(16 * (1 - subIn)));

    this.set('glass', 'opacity', n2(seg(t, BEAT * 1.6, BEAT * 2.6)));

    this.seekPhotos(t);

    /* hands + pour streams */
    let st: Stream | null = null;
    for (let i = 0; i < TOOLS.length; i++) {
      const tool = TOOLS[i];
      const pose = toolPose(tool, t);
      this.show(this.els[`toolw${i}`], !!pose);
      if (!pose) continue;
      this.set(`tool${i}`, 'transform', `translate(${n2(pose.x)} ${n2(pose.y)}) rotate(${n2(pose.a)})`);
      this.applyBlur(`toolw${i}`, 'tool', blurOf(pose, toolPose(tool, t - 1 / 240)));

      if (tool.step === STEP.torch) {
        const u = t - stepStart(STEP.torch);
        const on = u > POUR_ON - 0.12 && u < POUR_OFF + 0.08;
        const flick = 1 + 0.08 * Math.sin(t * 47) + 0.05 * Math.sin(t * 83 + 1.3);
        this.set('flame', 'opacity', on ? 1 : 0);
        this.set('flame', 'transform', `scale(${n2(flick)} ${n2(1 / flick)})`);
      }
      if (tool.empty) {
        const gone = this.emptied(tool.step, t);
        this.set(`full${i}`, 'opacity', n2(1 - gone));
        this.set(`empty${i}`, 'opacity', n2(Math.min(1, gone * 1.5)));
      }
      if (!tool.stream) continue;
      const u = t - stepStart(tool.step);
      const head = expOut(seg(u, POUR_ON, POUR_ON + 0.16));
      const tail = expIn(seg(u, POUR_OFF - 0.06, POUR_OFF + 0.12));
      if (head <= tail + 0.001) continue;
      const syrup = tool.step === STEP.syrup;
      const foam = tool.step === STEP.foam;
      st = {
        mx: pose.x,
        my: pose.y,
        lx: pose.x + tool.stream.dx,
        ly: syrup ? IN_TOP + 8 : foam ? FOAM_TOP + 6 : milkLevel(t),
        w: tool.stream.w,
        color: tool.stream.color,
        head,
        tail,
        splash: !syrup,
      };
    }
    if (st) {
      const d = `M ${n2(st.mx)} ${n2(st.my)} Q ${n2(st.mx + 4)} ${n2((st.my + st.ly) / 2)} ${n2(st.lx)} ${n2(st.ly)}`;
      const vis = n2(st.head - st.tail);
      for (const k of ['streamS', 'streamI', 'streamH']) {
        this.set(k, 'd', d);
        this.set(k, 'stroke-dasharray', `${vis} 2`);
        this.set(k, 'stroke-dashoffset', n2(-st.tail));
        this.set(k, 'opacity', 1);
      }
      this.set('streamS', 'stroke-width', st.w + 4);
      this.set('streamI', 'stroke-width', st.w);
      this.set('streamI', 'stroke', st.color);
      this.set('streamH', 'stroke-width', n2(Math.max(1.5, st.w * 0.22)));
      this.set('streamH', 'stroke-opacity', st.color === MILK_STREAM ? 0.9 : 0.4);
      const pouring = st.splash && st.head > 0.95 && st.tail < 0.05;
      for (let k = 0; k < SPLASH_COUNT; k++) {
        const ph = (((t * 2.4 + k / SPLASH_COUNT) % 1) + 1) % 1;
        const sideK = k % 2 ? 1 : -1;
        const spread = (6 + (k % 3) * 7) * sideK;
        this.set(`splash${k}`, 'cx', n2(st.lx + spread * ph * 2.2));
        this.set(`splash${k}`, 'cy', n2(st.ly - 34 * Math.sin(Math.PI * ph) * (0.6 + (k % 3) * 0.25)));
        this.set(`splash${k}`, 'r', n2((2.6 + (k % 2)) * (1 - ph * 0.6)));
        this.set(`splash${k}`, 'fill', st.color);
        this.set(`splash${k}`, 'opacity', pouring ? n2(0.9 * (1 - ph)) : 0);
      }
    } else {
      for (const k of ['streamS', 'streamI', 'streamH']) this.set(k, 'opacity', 0);
      for (let k = 0; k < SPLASH_COUNT; k++) this.set(`splash${k}`, 'opacity', 0);
    }

    /* pearls fall from the scoop and sink into the photo */
    this.pearlEls.forEach((el, i) => {
      const p = PEARLS[i];
      const dt = t - p.release;
      const landedFor = dt - p.fall;
      if (dt < 0 || landedFor > 0.22) {
        this.show(el, false);
        return;
      }
      this.show(el, true);
      let x = p.tx;
      let y = p.ty;
      let stretch = 1;
      if (dt < p.fall) {
        const k = dt / p.fall;
        x = lerp(p.x0, p.tx, k);
        y = p.y0 + 0.5 * PEARL_G * dt * dt;
        stretch = 1 + Math.min(0.55, PEARL_G * dt * 0.00016);
      } else {
        y = p.ty - hop(t, p.release + p.fall, 8, 12, 26);
      }
      el.setAttribute('opacity', String(n2(1 - seg(landedFor, 0.02, 0.22))));
      el.setAttribute('transform', `translate(${n2(x)} ${n2(y)}) scale(${n2(1 / Math.sqrt(stretch))} ${n2(stretch)})`);
    });

    /* ice tips out of the scoop and settles into the photo */
    ICE.forEach((c, k) => {
      const pose = icePose(c, t);
      const after = t - c.impact;
      const on = !!pose && after < 0.3;
      this.show(this.els[`icew${k}`], on);
      if (!on || !pose) return;
      this.set(`icew${k}`, 'opacity', n2(1 - seg(after, 0.05, 0.3)));
      this.set(`ice${k}`, 'transform', `translate(${n2(pose.x)} ${n2(pose.y)}) rotate(${n2(pose.a)})`);
      this.applyBlur(`icew${k}`, `ice${k}`, blurOf(pose, icePose(c, t - 1 / 240)));
    });

    /* sugar grains */
    this.grainEls.forEach((el, i) => {
      const g = GRAINS[i];
      const dt = t - g.release;
      const landedFor = dt - g.fall;
      if (dt < 0 || landedFor > 0.35) {
        this.show(el, false);
        return;
      }
      this.show(el, true);
      let x = g.tx;
      let y = g.ty;
      if (dt < g.fall) {
        const k = dt / g.fall;
        x = lerp(g.x0, g.tx, k);
        y = SUGAR_MOUTH_Y + 0.5 * SUGAR_G * dt * dt;
      }
      el.setAttribute('cx', String(n2(x)));
      el.setAttribute('cy', String(n2(y)));
      el.setAttribute('opacity', String(n2(1 - seg(landedFor, 0.05, 0.35))));
    });

    /* card frame + per-step content */
    const cardAt = stepStart(0) - 0.2;
    const cIn = spring(t, cardAt, 11, 9);
    const cOut = expIn(seg(t, FINISH_AT, FINISH_AT + 0.36));
    this.set(
      'cardFrame',
      'opacity',
      n2(seg(t, cardAt, cardAt + 0.2) * (1 - seg(t, FINISH_AT + 0.08, FINISH_AT + 0.36)))
    );
    this.set('cardFrame', 'transform', `translate(${n2(90 * (1 - cIn) + 520 * cOut)} 0)`);
    const barW = CARD.w - 184;
    for (let i = 0; i < STEP_COUNT; i++) {
      const s = stepStart(i);
      const end = i === STEP_COUNT - 1 ? FINISH_AT + 1 : stepStart(i + 1);
      const inS = spring(t, s, 14, 10);
      const op = seg(t, s, s + 0.18) * (1 - seg(t, end - 0.14, end));
      this.set(`card${i}`, 'opacity', n2(op));
      if (op <= 0) continue;
      this.set(`card${i}`, 'transform', `translate(0 ${n2(26 * (1 - inS) - 18 * seg(t, end - 0.14, end))})`);
      const frac = this.stepFraction(i, t);
      const w = barW * frac;
      this.set(`cardbar${i}`, 'width', n2(w));
      if (rtl) this.set(`cardbar${i}`, 'x', n2(CARD.x + CARD.w - 34 - w));
      const el = this.els[`cardnum${i}`];
      const text = this.counterText(i, frac, L.steps[i]?.unit ?? '');
      if (el && el.textContent !== text) el.textContent = text;
    }

    /* stepper */
    const sIn = spring(t, BEAT * 3, 11, 9);
    this.set(
      'stepper',
      'opacity',
      n2(seg(t, BEAT * 3, BEAT * 3 + 0.2) * (1 - seg(t, FINISH_AT + 0.08, FINISH_AT + 0.36)))
    );
    this.set('stepper', 'transform', `translate(0 ${n2(60 * (1 - sIn) + 140 * cOut)})`);
    for (let i = 0; i < STEP_COUNT; i++) {
      const s = stepStart(i);
      const doneAt = s + POUR_OFF;
      const done = t >= doneAt;
      const current = t >= s && t < s + BAR;
      const nodeX = rtl ? 960 - i * 140 : 120 + i * 140;
      const bump =
        1 +
        hop(t, s, 0.2, 7, 7) +
        (done ? 0.18 * Math.exp(-8 * (t - doneAt)) * Math.sin(Math.min(Math.PI, (t - doneAt) * 14)) : 0);
      this.set(`sn${i}`, 'transform', `translate(${nodeX} ${STEPPER_Y}) scale(${n2(bump)})`);
      this.set(`snc${i}`, 'fill', done ? ORANGE : '#fff');
      this.set(`snc${i}`, 'stroke', done || current ? ORANGE : FUTURE);
      this.set(`snc${i}`, 'stroke-width', current && !done ? 3 : 2);
      this.set(`snn${i}`, 'opacity', done ? 0 : 1);
      this.set(`snn${i}`, 'fill', current ? ORANGE : FUTURE_TEXT);
      this.set(`snk${i}`, 'opacity', done ? 1 : 0);
      this.set(`snl${i}`, 'fill', current ? ORANGE : done ? NAVY : FUTURE_TEXT);
      this.set(`snl${i}`, 'fill-opacity', done && !current ? 0.72 : 1);
      if (i < STEP_COUNT - 1) {
        const ln = this.els[`sl${i}`];
        if (ln) {
          const a = Number(ln.getAttribute('data-a'));
          const b = Number(ln.getAttribute('data-b'));
          const fill = expOut(seg(t, doneAt, s + BAR));
          ln.setAttribute('x2', String(n2(lerp(a, b, fill))));
          ln.setAttribute('opacity', fill > 0.01 ? '1' : '0');
        }
      }
    }

    /* light sweeps across the plastic as the camera settles, and again on the sign-off */
    const sweepA = seg(t, FINISH_AT + 0.4, FINISH_AT + 1.9);
    const sweepB = seg(t, OUTRO_AT + 0.4, OUTRO_AT + 1.7);
    const sw = sweepA > 0 && sweepA < 1 ? sweepA : sweepB;
    const swOn = sw > 0 && sw < 1;
    this.set('sheen', 'opacity', swOn ? n2(0.32 * Math.sin(Math.PI * sw)) : 0);
    if (swOn) this.set('sheen', 'transform', `translate(${n2(lerp(CX - 320, CX + 320, cubicInOut(sw)))} 600) rotate(16)`);

    /* recipe summary rows, then the sign-off */
    [STEP.syrup, STEP.pearls, STEP.ice, STEP.milk, STEP.foam].forEach((stepIdx, k) => {
      const t0 = CHIPS_AT - 1.2 + k * (BEAT / 2);
      const sp = spring(t, t0, 12, 9);
      this.set(`chip${stepIdx}`, 'opacity', n2(seg(t, t0, t0 + 0.15)));
      this.set(`chip${stepIdx}`, 'transform', `translate(${n2((rtl ? -1 : 1) * 40 * (1 - sp))} 0)`);
    });

    const so = spring(t, OUTRO_AT + 0.3, 11, 8);
    const sx = CARD.x + CARD.w / 2;
    const sy = 300 + 5 * 96 + 50;
    this.set('signoff', 'opacity', n2(seg(t, OUTRO_AT + 0.3, OUTRO_AT + 0.45)));
    this.set('signoff', 'transform', `translate(${sx} ${sy}) scale(${n2(lerp(0.7, 1, so))}) translate(${-sx} ${-sy})`);

    this.set('fade', 'opacity', n2(seg(t, DURATION - 0.45, DURATION)));
  }

  /** 0 → 1 as the scoop / spoon empties into the cup. */
  private emptied(step: number, t: number): number {
    const s = stepStart(step);
    switch (step) {
      case STEP.pearls:
        return seg(t, PEARLS[0].release, PEARLS[PEARL_COUNT - 1].release + 0.05);
      case STEP.ice:
        return seg(t, ICE[0].impact - ICE_FALL, ICE[ICE.length - 1].impact - ICE_FALL + 0.1);
      case STEP.sugar:
        return seg(t, GRAINS[0].release, GRAINS[GRAINS.length - 1].release);
      default:
        return seg(t, s + POUR_ON, s + POUR_OFF);
    }
  }

  private stepFraction(i: number, t: number): number {
    switch (i) {
      case STEP.syrup:
      case STEP.milk:
      case STEP.foam:
        return fillP(i, t);
      case STEP.pearls:
        return PEARLS.filter((p) => t >= p.release + p.fall).length / PEARL_COUNT;
      case STEP.ice:
        return ICE.filter((c) => t >= c.impact).length / ICE.length;
      case STEP.sugar:
        return GRAINS.filter((g) => t >= g.release + g.fall).length / GRAINS.length;
      case STEP.torch:
        return sweep(STEP.torch, t);
      default:
        return 0;
    }
  }

  private counterText(i: number, frac: number, unit: string): string {
    const target = STEP_TARGETS[i];
    const value = Math.round(target * frac);
    return `${value} / ${target}${unit ? ` ${unit}` : ''}`;
  }
}
