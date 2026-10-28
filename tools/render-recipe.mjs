// Renders the Brown Sugar Boba recipe scene from the running dev server.
//   node tools/render-recipe.mjs beats [en|ar]   → one PNG per beat + contact sheet
//   node tools/render-recipe.mjs full  [en|ar]   → 60fps MP4 (3 subframes blended) with soundtrack
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const mode = process.argv[2] || 'beats';
const lang = process.argv[3] === 'ar' ? 'ar' : 'en';
const base = process.env.RECIPE_URL || 'http://localhost:4200';
const out = path.resolve('renders', `recipe-${lang}`);
const FPS = 60;
const SUB = 3;
const DURATION = 24;
const BEAT = 0.6;

fs.rmSync(path.join(out, mode), { recursive: true, force: true });
fs.mkdirSync(path.join(out, mode), { recursive: true });

async function launch() {
  for (const opts of [{}, { channel: 'chrome' }, { channel: 'msedge' }]) {
    try {
      return await chromium.launch(opts);
    } catch {
      /* try next */
    }
  }
  throw new Error('No Chromium available for Playwright');
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
await page.addInitScript((l) => {
  localStorage.setItem('br', '5');
  localStorage.setItem('br_chosen', '1');
  localStorage.setItem('lang', l);
}, lang);
await page.goto(`${base}/recipe-render?lang=${lang}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.recipeReady === true, null, { timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const clip = { x: 0, y: 0, width: 1080, height: 1080 };
const shot = (file, type = 'png') =>
  page.screenshot({ path: file, clip, type, ...(type === 'jpeg' ? { quality: 94 } : {}) });

if (mode === 'beats') {
  const beats = Math.round(DURATION / BEAT);
  for (let b = 0; b < beats; b++) {
    const t = b * BEAT + 0.3;
    await page.evaluate((x) => window.seek(x), t);
    await shot(path.join(out, 'beats', `b_${String(b).padStart(2, '0')}.png`));
  }
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-i', path.join(out, 'beats', 'b_%02d.png'),
    '-vf', 'scale=360:-1,tile=10x5:padding=4:color=white',
    '-frames:v', '1', path.join(out, 'beats-sheet.png'),
  ]);
  console.log('beats done →', path.join(out, 'beats-sheet.png'));
} else {
  const frames = FPS * DURATION;
  const t0 = Date.now();
  let n = 0;
  for (let f = 0; f < frames; f++) {
    for (let s = 0; s < SUB; s++) {
      const t = (f + s / SUB) / FPS;
      await page.evaluate((x) => window.seek(x), t);
      await shot(path.join(out, 'full', `f_${String(n).padStart(5, '0')}.jpg`), 'jpeg');
      n++;
    }
    if (f % 120 === 0) console.log(`frame ${f}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }

  const wavB64 = await page.evaluate(() => window.recipeWav());
  const wav = path.join(out, 'soundtrack.wav');
  fs.writeFileSync(wav, Buffer.from(wavB64, 'base64'));

  const silent = path.join(out, 'video-silent.mp4');
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-framerate', String(FPS * SUB), '-i', path.join(out, 'full', 'f_%05d.jpg'),
    '-vf', `tmix=frames=${SUB}:weights='1 1 1',select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/${FPS}/TB`,
    '-r', String(FPS), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow', silent,
  ]);
  const final = path.join(out, `bubble-hope-brown-sugar-boba-${lang}.mp4`);
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest',
    '-movflags', '+faststart', final,
  ]);
  console.log('done →', final);
}

await browser.close();
