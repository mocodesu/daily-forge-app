#!/usr/bin/env node
// Generates all WAV files for DailyForge.
// Run once (or after changing the synthesis): node scripts/generate-sounds.js

const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 22050;
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
  },
) {
  const start = samplesFor(startMs);
  const length = samplesFor(durationMs);
  const attackLen = samplesFor(attackMs);

  for (let i = 0; i < length; i++) {
    const idx = start + i;
    if (idx >= buffer.length) break;
    const t = i / SAMPLE_RATE;

    // Envelope: fast attack, exponential release
    const attack = i < attackLen ? i / attackLen : 1;
    const release = Math.exp(-decay * t);

    let sample = 0;
    for (const [mult, gain] of harmonics) {
      sample += Math.sin(TWO_PI * freq * mult * t) * gain;
    }

    buffer[idx] += sample * volume * attack * release;
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

  for (let i = 0; i < length; i++) {
    const idx = start + i;
    if (idx >= buffer.length) break;
    const t = i / length;

    // Amplitude envelope: quick swell, long tail
    const env = Math.sin(Math.PI * t) ** 2;

    // White noise, low-passed via simple exponential smoothing
    const white = Math.random() * 2 - 1;
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

  // Random clusters of high-frequency short notes
  const clusterCount = 14;
  for (let c = 0; c < clusterCount; c++) {
    const clusterOffset = Math.floor(Math.random() * (length - samplesFor(60)));
    const freq = 1500 + Math.random() * 2000;
    const t = 0;
    const noteLen = samplesFor(40 + Math.random() * 80);

    for (let i = 0; i < noteLen; i++) {
      const idx = start + clusterOffset + i;
      if (idx >= buffer.length) break;
      const dt = i / SAMPLE_RATE;
      const env = Math.exp(-12 * dt);
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

// ─────────────────────────────────────────────────────────────
// Celebration sounds
// ─────────────────────────────────────────────────────────────

/**
 * Day-complete chime: two warm bell notes in a major third.
 * Total 1600ms. Feels satisfying without being loud.
 */
function generateDayComplete() {
  const buffer = silence(1600);

  // Note 1: C5
  addNote(buffer, {
    freq: 523.25,
    startMs: 0,
    durationMs: 500,
    volume: 0.42,
    harmonics: [
      [1, 1],
      [2, 0.4],
      [3, 0.18],
      [4.2, 0.08],
    ],
    decay: 5,
  });

  // Note 2: E5, overlapping
  addNote(buffer, {
    freq: 659.25,
    startMs: 220,
    durationMs: 1200,
    volume: 0.45,
    harmonics: [
      [1, 1],
      [2, 0.42],
      [3, 0.2],
      [4.2, 0.1],
    ],
    decay: 3.2,
  });

  // Subtle high shimmer on top
  addSparkles(buffer, { startMs: 250, durationMs: 1000, volume: 0.05 });

  limit(buffer);
  return buffer;
}

/**
 * Target-reached fanfare: ascending C-major arpeggio into a held
 * chord, with a soft applause swell underneath.
 * Total 4200ms. The "grand" moment.
 */
function generateTargetReached() {
  const buffer = silence(4200);

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
  return buffer;
}

// ─────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, "..", "assets", "sounds");
fs.mkdirSync(outDir, { recursive: true });

// Timer sounds (existing)
writeWav(generateTone(1150, 100, 1000, 0.35), path.join(outDir, "pop.wav"));
writeWav(generateTone(880, 50, 1000, 0.28), path.join(outDir, "tick.wav"));
writeWav(generateTone(1500, 300, 1000, 0.32), path.join(outDir, "glass.wav"));

// Celebration sounds (new)
writeWav(generateDayComplete(), path.join(outDir, "day-complete.wav"));
writeWav(generateTargetReached(), path.join(outDir, "target-reached.wav"));

console.log("✓ Generated 5 WAV files in", outDir);
["pop", "tick", "glass", "day-complete", "target-reached"].forEach((n) => {
  const p = path.join(outDir, `${n}.wav`);
  const { size } = fs.statSync(p);
  console.log(`  ${n}.wav  (${(size / 1024).toFixed(1)} KB)`);
});
