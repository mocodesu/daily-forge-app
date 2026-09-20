#!/usr/bin/env node
// Generates all WAV files for DailyForge.
// Run once (or after changing the synthesis): node scripts/generate-sounds.js

const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 44100;
const CHANNELS = 1;
const BITS = 16;
const TWO_PI = Math.PI * 2;

// ─────────────────────────────────────────────────────────────
// WAV writer
// ─────────────────────────────────────────────────────────────

function writeWav(buffer, outPath) {
  const numSamples = buffer.length;
  const fileSize = 44 + numSamples * 2;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(fileSize - 8, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE((SAMPLE_RATE * CHANNELS * BITS) / 8, 28);
  header.writeUInt16LE((CHANNELS * BITS) / 8, 32);
  header.writeUInt16LE(BITS, 34);
  header.write("data", 36);
  header.writeUInt32LE(numSamples * 2, 40);

  const dataBuf = Buffer.alloc(numSamples * 2);
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, buffer[i]));
    dataBuf.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }

  fs.writeFileSync(outPath, Buffer.concat([header, dataBuf]));
}

// ─────────────────────────────────────────────────────────────
// Synthesis primitives
// ─────────────────────────────────────────────────────────────

/** Length in samples for a given duration in ms. */
const samplesFor = (ms) => Math.floor((SAMPLE_RATE * ms) / 1000);

/** A silent buffer for a given total duration. */
function silence(totalMs) {
  return new Float32Array(samplesFor(totalMs));
}

/**
 * Adds a single note to the buffer.
 * - freq: fundamental in Hz
 * - startMs / durationMs: timing
 * - volume: peak amplitude (0..1)
 * - harmonics: array of [multiple, gain] for additive synthesis
 * - decay: exponential decay rate; higher = faster fade
 */
function addNote(
  buffer,
  {
    freq,
    startMs,
    durationMs,
    volume = 0.4,
    harmonics = [
      [1, 1],
      [2, 0.35],
      [3, 0.15],
    ],
    decay = 4,
    attackMs = 8,
    releaseMs = 42,
  },
) {
  const start = samplesFor(startMs);
  const length = samplesFor(durationMs);
  const attackLen = samplesFor(attackMs);
  const releaseLen = Math.max(1, samplesFor(releaseMs));

  for (let i = 0; i < length; i++) {
    const idx = start + i;
    if (idx >= buffer.length) break;
    const t = i / SAMPLE_RATE;

    // Envelope: fast attack, exponential release
    const attack =
      i < attackLen ? Math.sin((i / attackLen) * Math.PI * 0.5) : 1;
    const tail =
      i > length - releaseLen
        ? Math.sin(((length - i) / releaseLen) * Math.PI * 0.5)
        : 1;
    const release = Math.exp(-decay * t) * tail;

    let sample = 0;
    for (const [mult, gain] of harmonics) {
      sample += Math.sin(TWO_PI * freq * mult * t) * gain;
    }

    buffer[idx] += sample * volume * attack * release;
  }
}

/** Adds a pitched sweep for a clear upward reward contour. */
function addSweep(
  buffer,
  {
    startMs,
    durationMs,
    startFreq,
    endFreq,
    volume = 0.25,
    decay = 5,
    releaseMs = 30,
    harmonics = [
      [1, 1],
      [2, 0.18],
    ],
  },
) {
  const start = samplesFor(startMs);
  const length = samplesFor(durationMs);
  const attackLen = Math.max(1, samplesFor(3));
  const releaseLen = Math.max(1, samplesFor(releaseMs));
  let phase = 0;

  for (let i = 0; i < length; i++) {
    const idx = start + i;
    if (idx >= buffer.length) break;

    const progress = i / Math.max(1, length - 1);
    const freq = startFreq * Math.pow(endFreq / startFreq, progress);
    const attack = Math.sin(Math.min(1, i / attackLen) * Math.PI * 0.5);
    const tail =
      i > length - releaseLen
        ? Math.sin(((length - i) / releaseLen) * Math.PI * 0.5)
        : 1;
    const release = Math.exp(-decay * (i / SAMPLE_RATE)) * tail;
    let sample = 0;

    for (const [mult, gain] of harmonics) {
      sample += Math.sin(phase * mult) * gain;
    }

    buffer[idx] += sample * volume * attack * release;
    phase += (TWO_PI * freq) / SAMPLE_RATE;
  }
}

/** Adds a short filtered noise transient to make feedback feel immediate. */
function addTransient(buffer, { startMs, durationMs, volume = 0.1 }) {
  const start = samplesFor(startMs);
  const length = samplesFor(durationMs);
  let previous = 0;
  let seed = 417;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < length; i++) {
    const idx = start + i;
    if (idx >= buffer.length) break;

    const white = random() * 2 - 1;
    const filtered = white - previous * 0.82;
    previous = white;
    const attack = Math.min(1, i / Math.max(1, samplesFor(1)));
    const envelope = attack * Math.exp(-24 * (i / SAMPLE_RATE));
    buffer[idx] += filtered * volume * envelope;
  }
}

/**
 * Adds a soft noise burst, filtered to feel like distant applause.
 * Uses a simple one-pole low-pass to take the edge off.
 */
function addApplause(
  buffer,
  { startMs, durationMs, volume = 0.12, cutoff = 0.35 },
) {
  const start = samplesFor(startMs);
  const length = samplesFor(durationMs);
  let prev = 0;
  let seed = 1301;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < length; i++) {
    const idx = start + i;
    if (idx >= buffer.length) break;
    const t = i / length;

    // Amplitude envelope: quick swell, long tail
    const env = Math.sin(Math.PI * t) ** 2;

    // White noise, low-passed via simple exponential smoothing
    const white = random() * 2 - 1;
    prev = prev + cutoff * (white - prev);

    buffer[idx] += prev * volume * env;
  }
}

/**
 * Adds a short high-frequency "sparkle" cluster for shimmer.
 */
function addSparkles(buffer, { startMs, durationMs, volume = 0.08 }) {
  const start = samplesFor(startMs);
  const length = samplesFor(durationMs);

  // Seeded clusters keep generated assets reproducible between runs.
  let seed = 731;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const clusterCount = 14;
  for (let c = 0; c < clusterCount; c++) {
    const clusterOffset = Math.floor(random() * (length - samplesFor(60)));
    const freq = 1500 + random() * 2000;
    const noteLen = samplesFor(40 + random() * 80);

    for (let i = 0; i < noteLen; i++) {
      const idx = start + clusterOffset + i;
      if (idx >= buffer.length) break;
      const dt = i / SAMPLE_RATE;
      const attack = Math.min(1, i / Math.max(1, samplesFor(3)));
      const tail = Math.sin(
        Math.min(1, (noteLen - i) / Math.max(1, samplesFor(24))) *
          Math.PI *
          0.5,
      );
      const env = attack * tail * Math.exp(-12 * dt);
      buffer[idx] += Math.sin(TWO_PI * freq * dt) * volume * env;
    }
  }
}

/** Soft limiter to prevent clipping after summing layers. */
function limit(buffer, threshold = 0.95) {
  for (let i = 0; i < buffer.length; i++) {
    const v = buffer[i];
    if (v > threshold) buffer[i] = threshold - (v - threshold) * 0.3;
    else if (v < -threshold) buffer[i] = -threshold - (v + threshold) * 0.3;
  }
}

/** Masters each cue to a consistent, clean peak and removes tail clicks. */
function finish(buffer, targetPeak = 0.84) {
  let peak = 0;
  for (const sample of buffer) peak = Math.max(peak, Math.abs(sample));

  if (peak > 0) {
    const gain = targetPeak / peak;
    for (let i = 0; i < buffer.length; i++) buffer[i] *= gain;
  }

  const fadeLength = Math.min(samplesFor(24), buffer.length);
  for (let i = 0; i < fadeLength; i++) {
    const index = buffer.length - fadeLength + i;
    buffer[index] *= 1 - i / fadeLength;
  }
  return buffer;
}

// ─────────────────────────────────────────────────────────────
// Existing timer sounds (pop, tick, glass)
// ─────────────────────────────────────────────────────────────

function generateTone(freqHz, toneMs, totalMs, volume) {
  const numSamples = samplesFor(totalMs);
  const toneSamples = samplesFor(toneMs);
  const buffer = new Float32Array(numSamples);

  for (let i = 0; i < toneSamples && i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const attack = Math.min(1, i / 100);
    const release = Math.min(1, (toneSamples - i) / 100);
    buffer[i] = Math.sin(TWO_PI * freqHz * t) * volume * attack * release;
  }
  return buffer;
}

function generateSessionStart() {
  const buffer = silence(1000);
  addTransient(buffer, { startMs: 0, durationMs: 42, volume: 0.11 });
  addSweep(buffer, {
    startMs: 0,
    durationMs: 105,
    startFreq: 360,
    endFreq: 760,
    volume: 0.28,
    decay: 10,
  });
  addNote(buffer, {
    freq: 1046.5,
    startMs: 32,
    durationMs: 170,
    volume: 0.16,
    harmonics: [
      [1, 1],
      [2, 0.2],
      [3, 0.08],
    ],
    decay: 14,
    attackMs: 2,
  });
  limit(buffer);
  return finish(buffer, 0.76);
}

function generateTick() {
  const buffer = silence(1000);
  addTransient(buffer, { startMs: 0, durationMs: 24, volume: 0.045 });
  addNote(buffer, {
    freq: 1320,
    startMs: 0,
    durationMs: 42,
    volume: 0.12,
    harmonics: [
      [1, 1],
      [2, 0.1],
    ],
    decay: 28,
    attackMs: 1,
  });
  limit(buffer);
  return finish(buffer, 0.5);
}

function generateCompletion() {
  const buffer = silence(1000);
  addTransient(buffer, { startMs: 0, durationMs: 55, volume: 0.13 });
  addSweep(buffer, {
    startMs: 0,
    durationMs: 170,
    startFreq: 440,
    endFreq: 880,
    volume: 0.24,
    decay: 8,
  });
  addNote(buffer, {
    freq: 659.25,
    startMs: 75,
    durationMs: 360,
    volume: 0.25,
    harmonics: [
      [1, 1],
      [2, 0.32],
      [3, 0.12],
      [4, 0.05],
    ],
    decay: 7,
    attackMs: 3,
  });
  addNote(buffer, {
    freq: 1046.5,
    startMs: 135,
    durationMs: 600,
    volume: 0.3,
    harmonics: [
      [1, 1],
      [2, 0.3],
      [3, 0.12],
      [4, 0.05],
    ],
    decay: 4.5,
    attackMs: 4,
  });
  addSparkles(buffer, { startMs: 130, durationMs: 420, volume: 0.035 });
  limit(buffer);
  return finish(buffer, 0.84);
}

// ─────────────────────────────────────────────────────────────
// Celebration sounds
// ─────────────────────────────────────────────────────────────

/**
 * Day-complete chime: two warm bell notes in a major third.
 * Total 1600ms. Feels satisfying without being loud.
 */
function generateDayComplete() {
  const buffer = silence(1600);

  addTransient(buffer, { startMs: 0, durationMs: 55, volume: 0.12 });

  // Fast major arpeggio: C5, E5, G5, C6.
  addNote(buffer, {
    freq: 523.25,
    startMs: 0,
    durationMs: 420,
    volume: 0.34,
    harmonics: [
      [1, 1],
      [2, 0.4],
      [3, 0.18],
      [4.2, 0.08],
    ],
    decay: 5,
  });

  addNote(buffer, {
    freq: 659.25,
    startMs: 150,
    durationMs: 760,
    volume: 0.34,
    harmonics: [
      [1, 1],
      [2, 0.42],
      [3, 0.2],
      [4.2, 0.1],
    ],
    decay: 3.2,
  });
  addNote(buffer, {
    freq: 783.99,
    startMs: 300,
    durationMs: 900,
    volume: 0.32,
    harmonics: [
      [1, 1],
      [2, 0.38],
      [3, 0.16],
      [4.2, 0.08],
    ],
    decay: 2.6,
  });
  addNote(buffer, {
    freq: 1046.5,
    startMs: 470,
    durationMs: 1050,
    volume: 0.38,
    harmonics: [
      [1, 1],
      [2, 0.42],
      [3, 0.2],
      [4.2, 0.1],
    ],
    decay: 2.1,
  });

  // Subtle high shimmer on top
  addSparkles(buffer, { startMs: 250, durationMs: 1000, volume: 0.05 });

  limit(buffer);
  return finish(buffer, 0.84);
}

/**
 * Target-reached fanfare: ascending C-major arpeggio into a held
 * chord, with a soft applause swell underneath.
 * Total 4200ms. The "grand" moment.
 */
function generateTargetReached() {
  const buffer = silence(4200);

  addTransient(buffer, { startMs: 0, durationMs: 70, volume: 0.14 });
  addSweep(buffer, {
    startMs: 0,
    durationMs: 760,
    startFreq: 180,
    endFreq: 920,
    volume: 0.13,
    decay: 1.8,
    harmonics: [
      [1, 1],
      [2, 0.12],
    ],
  });

  // ── Ascending arpeggio ────────────────────────────────
  addNote(buffer, {
    freq: 523.25, // C5
    startMs: 0,
    durationMs: 400,
    volume: 0.36,
    decay: 3.5,
  });
  addNote(buffer, {
    freq: 659.25, // E5
    startMs: 180,
    durationMs: 400,
    volume: 0.36,
    decay: 3.5,
  });
  addNote(buffer, {
    freq: 783.99, // G5
    startMs: 360,
    durationMs: 400,
    volume: 0.36,
    decay: 3.5,
  });
  addNote(buffer, {
    freq: 1046.5, // C6
    startMs: 540,
    durationMs: 500,
    volume: 0.4,
    decay: 3,
  });

  // ── Held C-major chord ────────────────────────────────
  const chordStart = 900;
  const chordMs = 2200;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    addNote(buffer, {
      freq,
      startMs: chordStart,
      durationMs: chordMs,
      volume: 0.22,
      harmonics: [
        [1, 1],
        [2, 0.35],
        [3, 0.12],
      ],
      decay: 1.4,
      attackMs: 40,
    });
  });

  // Octave doubling for the chord
  addNote(buffer, {
    freq: 2093.0, // C7
    startMs: chordStart,
    durationMs: 1500,
    volume: 0.09,
    harmonics: [[1, 1]],
    decay: 2.4,
    attackMs: 60,
  });

  // ── Soft applause layer beneath the chord ────────────
  addApplause(buffer, {
    startMs: 300,
    durationMs: 3400,
    volume: 0.11,
    cutoff: 0.32,
  });

  // ── Sparkles throughout ──────────────────────────────
  addSparkles(buffer, { startMs: 900, durationMs: 2600, volume: 0.07 });

  limit(buffer);
  return finish(buffer, 0.86);
}

// ─────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, "..", "assets", "sounds");
fs.mkdirSync(outDir, { recursive: true });

// Timer sounds (existing)
writeWav(generateSessionStart(), path.join(outDir, "pop.wav"));
writeWav(generateTick(), path.join(outDir, "tick.wav"));
writeWav(generateCompletion(), path.join(outDir, "glass.wav"));

// Celebration sounds (new)
writeWav(generateDayComplete(), path.join(outDir, "day-complete.wav"));
writeWav(generateTargetReached(), path.join(outDir, "target-reached.wav"));

console.log("✓ Generated 5 WAV files in", outDir);
["pop", "tick", "glass", "day-complete", "target-reached"].forEach((n) => {
  const p = path.join(outDir, `${n}.wav`);
  const { size } = fs.statSync(p);
  console.log(`  ${n}.wav  (${(size / 1024).toFixed(1)} KB)`);
});
