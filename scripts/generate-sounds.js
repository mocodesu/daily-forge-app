#!/usr/bin/env node
// Generates three WAV files for DailyForge.
// Run once: node scripts/generate-sounds.js

const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 22050;
const CHANNELS = 1;
const BITS = 16;

/**
 * Builds a mono 16-bit PCM WAV.
 * @param freqHz        tone frequency
 * @param toneMs        length of the actual tone (ms)
 * @param totalMs       total file length including silence padding (ms)
 * @param volume        0..1
 */
function generateTone(freqHz, toneMs, totalMs, volume) {
  const numSamples = Math.floor((SAMPLE_RATE * totalMs) / 1000);
  const toneSamples = Math.floor((SAMPLE_RATE * toneMs) / 1000);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE((SAMPLE_RATE * CHANNELS * BITS) / 8, 28);
  buffer.writeUInt16LE((CHANNELS * BITS) / 8, 32);
  buffer.writeUInt16LE(BITS, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    let sample = 0;
    if (i < toneSamples) {
      const t = i / SAMPLE_RATE;
      const attack = Math.min(1, i / 100);
      const release = Math.min(1, (toneSamples - i) / 100);
      sample = Math.sin(2 * Math.PI * freqHz * t) * volume * attack * release;
    }
    const clamped = Math.max(-1, Math.min(1, sample));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  return buffer;
}

const outDir = path.join(__dirname, "..", "assets", "sounds");
fs.mkdirSync(outDir, { recursive: true });

// Tone durations are short, but totalMs is exactly 1000ms so the
// Android "under 1 second" bug never triggers.
fs.writeFileSync(
  path.join(outDir, "pop.wav"),
  generateTone(1150, 100, 1000, 0.35),
);
fs.writeFileSync(
  path.join(outDir, "tick.wav"),
  generateTone(880, 50, 1000, 0.28),
);
fs.writeFileSync(
  path.join(outDir, "glass.wav"),
  generateTone(1500, 300, 1000, 0.32),
);

console.log("✓ Generated 3 WAV files in", outDir);
