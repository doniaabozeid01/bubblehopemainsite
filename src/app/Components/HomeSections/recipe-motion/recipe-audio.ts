import { BAR, BEAT, DURATION, soundCues, SoundCue } from './recipe-scene';

const NOTE = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/* F major, one chord per bar: Fmaj7 · Dm7 · B♭maj7 · C */
const CHORDS = [
  [53, 57, 60, 64],
  [50, 53, 57, 60],
  [46, 50, 53, 57],
  [48, 52, 55, 60],
];
const ARP = [0, 1, 2, 3, 2, 1, 2, 3];

function noiseBuffer(ctx: BaseAudioContext, seconds = 2): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  let seed = 1234567;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  return buf;
}

function envGain(ctx: BaseAudioContext, out: AudioNode, t: number, peak: number, attack: number, decay: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(out);
  return g;
}

function tone(ctx: BaseAudioContext, out: AudioNode, t: number, freq: number, peak: number, decay: number, type: OscillatorType = 'sine', endFreq?: number) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + decay * 0.8);
  o.connect(envGain(ctx, out, t, peak, 0.004, decay));
  o.start(t);
  o.stop(t + decay + 0.05);
}

function noiseHit(ctx: BaseAudioContext, out: AudioNode, noise: AudioBuffer, t: number, peak: number, decay: number, filter: BiquadFilterType, freq: number, q = 0.8) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  src.connect(f);
  f.connect(envGain(ctx, out, t, peak, 0.002, decay));
  src.start(t, Math.random() * 1.5);
  src.stop(t + decay + 0.05);
}

function music(ctx: BaseAudioContext, out: AudioNode, noise: AudioBuffer) {
  const bars = Math.ceil(DURATION / BAR);
  const pluckBus = ctx.createBiquadFilter();
  pluckBus.type = 'lowpass';
  pluckBus.frequency.value = 2600;
  pluckBus.connect(out);

  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * BAR;
    const chord = CHORDS[bar % CHORDS.length];
    const full = bar >= 1;

    ARP.forEach((idx, k) => {
      const t = t0 + k * (BEAT / 2);
      if (t >= DURATION - 0.3) return;
      const midi = chord[idx] + 12;
      tone(ctx, pluckBus, t, NOTE(midi), k % 2 ? 0.05 : 0.075, 0.38, 'triangle');
      tone(ctx, pluckBus, t, NOTE(midi + 12), 0.018, 0.22, 'sine');
    });

    if (t0 < DURATION - 0.3) {
      const bass = ctx.createOscillator();
      bass.type = 'sine';
      bass.frequency.value = NOTE(chord[0] - 12);
      bass.connect(envGain(ctx, out, t0, full ? 0.2 : 0.1, 0.02, BAR * 0.9));
      bass.start(t0);
      bass.stop(t0 + BAR);
    }

    for (let beat = 0; beat < 4; beat++) {
      const t = t0 + beat * BEAT;
      if (t >= DURATION - 0.3) continue;
      if (full && (beat === 0 || beat === 2)) tone(ctx, out, t, 140, 0.42, 0.28, 'sine', 46);
      if (full && (beat === 1 || beat === 3)) noiseHit(ctx, out, noise, t, 0.07, 0.09, 'bandpass', 1900, 0.9);
      noiseHit(ctx, out, noise, t, 0.025, 0.03, 'highpass', 7500);
      noiseHit(ctx, out, noise, t + BEAT / 2, 0.04, 0.035, 'highpass', 7500);
    }
  }
}

function pour(ctx: BaseAudioContext, out: AudioNode, noise: AudioBuffer, cue: SoundCue) {
  const t = cue.t;
  const end = cue.end ?? t + 1;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(cue.from ?? 500, t);
  bp.frequency.linearRampToValueAtTime(cue.to ?? 1400, end);
  const g = ctx.createGain();
  const peak = cue.gain ?? 0.4;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.06);
  g.gain.setValueAtTime(peak, end - 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, end + 0.12);

  const gurgle = ctx.createGain();
  gurgle.gain.value = 0.7;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 11;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.3;
  lfo.connect(lfoDepth);
  lfoDepth.connect(gurgle.gain);

  src.connect(bp);
  bp.connect(gurgle);
  gurgle.connect(g);
  g.connect(out);
  src.start(t);
  lfo.start(t);
  src.stop(end + 0.2);
  lfo.stop(end + 0.2);
}

function clink(ctx: BaseAudioContext, out: AudioNode, noise: AudioBuffer, t: number, gain = 1) {
  [2637, 3520, 4186, 5274].forEach((f, i) => tone(ctx, out, t, f * (1 + (i - 1.5) * 0.004), 0.05 * gain, 0.25 + i * 0.07));
  tone(ctx, out, t, 190, 0.22 * gain, 0.12, 'sine', 90);
  noiseHit(ctx, out, noise, t, 0.08 * gain, 0.015, 'highpass', 4000);
}

function sfx(ctx: BaseAudioContext, out: AudioNode, noise: AudioBuffer) {
  for (const cue of soundCues()) {
    switch (cue.kind) {
      case 'pour':
        pour(ctx, out, noise, cue);
        break;
      case 'plop':
        tone(ctx, out, cue.t, 540 + Math.random() * 120, 0.06, 0.07, 'sine', 170);
        break;
      case 'clink':
        clink(ctx, out, noise, cue.t, cue.gain ?? 1);
        break;
      case 'sprinkle':
        noiseHit(ctx, out, noise, cue.t, 0.06, 0.025, 'highpass', 5200, 0.7);
        break;
      case 'hiss': {
        const end = cue.end ?? cue.t + 1.2;
        const src = ctx.createBufferSource();
        src.buffer = noise;
        src.loop = true;
        const hp = ctx.createBiquadFilter();
        hp.type = 'bandpass';
        hp.frequency.value = 2400;
        hp.Q.value = 0.5;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, cue.t);
        g.gain.exponentialRampToValueAtTime(0.22, cue.t + 0.08);
        g.gain.setValueAtTime(0.22, end - 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, end + 0.1);
        src.connect(hp);
        hp.connect(g);
        g.connect(out);
        src.start(cue.t);
        src.stop(end + 0.2);
        tone(ctx, out, cue.t, 90, 0.18, 0.12, 'sine', 60);
        break;
      }
      case 'pop':
        tone(ctx, out, cue.t, 620, 0.18, 0.12, 'sine', 980);
        break;
      case 'tick':
        tone(ctx, out, cue.t, 1760, 0.04, 0.06, 'triangle');
        break;
      case 'chime': {
        const g = cue.gain ?? 1;
        [84, 88, 91, 96].forEach((m, i) => tone(ctx, out, cue.t + i * 0.09, NOTE(m), 0.06 * g, 1.1, 'sine'));
        break;
      }
    }
  }
}

/** Renders the full 30 s soundtrack offline: light music under the recipe sounds. */
export async function renderSoundtrack(sampleRate = 44100): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(DURATION * sampleRate), sampleRate);
  const noise = noiseBuffer(ctx);

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.85, 0);
  master.gain.setValueAtTime(0.85, DURATION - 1.2);
  master.gain.linearRampToValueAtTime(0, DURATION);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 3;
  master.connect(comp);
  comp.connect(ctx.destination);

  const musicBus = ctx.createGain();
  musicBus.gain.value = 0.55;
  musicBus.connect(master);
  const sfxBus = ctx.createGain();
  sfxBus.gain.value = 1;
  sfxBus.connect(master);

  music(ctx, musicBus, noise);
  sfx(ctx, sfxBus, noise);
  return ctx.startRendering();
}

/** 16-bit PCM WAV of an AudioBuffer. */
export function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const bytes = frames * channels * 2;
  const out = new ArrayBuffer(44 + bytes);
  const view = new DataView(out);
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  view.setUint32(4, 36 + bytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, bytes, true);
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let o = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return out;
}
