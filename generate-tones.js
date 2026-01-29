/**
 * Generate EMS-style notification tone WAV files
 * Run: node generate-tones.js
 * Outputs WAV files to hoscad-frontend/
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const outDir = path.join(__dirname, 'hoscad-frontend');

function writeWav(filename, samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * 2; // 16-bit mono
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);

  // RIFF header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);

  // fmt chunk
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);       // chunk size
  buf.writeUInt16LE(1, 20);        // PCM
  buf.writeUInt16LE(1, 22);        // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(2, 32);        // block align
  buf.writeUInt16LE(16, 34);       // bits per sample

  // data chunk
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }

  const filepath = path.join(outDir, filename);
  fs.writeFileSync(filepath, buf);
  console.log(`  Created: ${filename} (${(buf.length / 1024).toFixed(1)} KB, ${(numSamples / SAMPLE_RATE).toFixed(2)}s)`);
}

// Generate a tone with smooth envelope and optional harmonics
function tone(freq, durationMs, volume = 0.5, opts = {}) {
  const numSamples = Math.round((durationMs / 1000) * SAMPLE_RATE);
  const samples = new Float64Array(numSamples);
  const attackMs = opts.attack || 15;
  const releaseMs = opts.release || 30;
  const attackSamples = Math.round((attackMs / 1000) * SAMPLE_RATE);
  const releaseSamples = Math.round((releaseMs / 1000) * SAMPLE_RATE);
  const harmonic2 = opts.harmonic2 || 0;  // 2nd harmonic amplitude
  const harmonic3 = opts.harmonic3 || 0;  // 3rd harmonic amplitude

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Envelope
    let env = 1;
    if (i < attackSamples) {
      env = i / attackSamples;
      env = env * env; // quadratic attack (smooth)
    } else if (i > numSamples - releaseSamples) {
      env = (numSamples - i) / releaseSamples;
      env = env * env; // quadratic release
    }

    // Waveform with harmonics
    let wave = Math.sin(2 * Math.PI * freq * t);
    if (harmonic2) wave += harmonic2 * Math.sin(2 * Math.PI * freq * 2 * t);
    if (harmonic3) wave += harmonic3 * Math.sin(2 * Math.PI * freq * 3 * t);

    // Normalize
    const norm = 1 + Math.abs(harmonic2) + Math.abs(harmonic3);
    samples[i] = (wave / norm) * env * volume;
  }
  return samples;
}

// Concatenate sample arrays with silence gap
function concat(...parts) {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Float64Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function silence(ms) {
  return new Float64Array(Math.round((ms / 1000) * SAMPLE_RATE));
}

console.log('Generating EMS notification tones...\n');

// 1. CHANGE TONE - Quick double chirp (board state changes)
// Clean 880Hz double beep with warm harmonics
writeWav('tone-change.wav', concat(
  tone(880, 80, 0.35, { harmonic2: 0.15, attack: 8, release: 25 }),
  silence(70),
  tone(880, 80, 0.35, { harmonic2: 0.15, attack: 8, release: 25 })
));

// 2. NOTE TONE - Notification (new note/banner)
// Gentle two-tone chime, descending
writeWav('tone-note.wav', concat(
  tone(784, 100, 0.3, { harmonic2: 0.2, harmonic3: 0.05, attack: 10, release: 40 }),
  silence(50),
  tone(659, 120, 0.3, { harmonic2: 0.2, harmonic3: 0.05, attack: 10, release: 50 })
));

// 3. MESSAGE TONE - Single clean chirp (message received)
writeWav('tone-message.wav', concat(
  tone(700, 120, 0.3, { harmonic2: 0.12, attack: 10, release: 40 })
));

// 4. ALERT TONE - Two-tone dispatch alert (like Plectron/pager alert)
// Classic EMS: low tone then high tone, each ~1 second
writeWav('tone-alert.wav', concat(
  tone(500, 900, 0.5, { harmonic2: 0.1, harmonic3: 0.05, attack: 20, release: 60 }),
  silence(50),
  tone(700, 1800, 0.5, { harmonic2: 0.1, harmonic3: 0.05, attack: 20, release: 80 })
));

// 5. URGENT/HOT MESSAGE TONE - Triple ascending beep (attention-getting)
writeWav('tone-urgent.wav', concat(
  tone(700, 130, 0.45, { harmonic2: 0.15, attack: 8, release: 30 }),
  silence(80),
  tone(880, 130, 0.45, { harmonic2: 0.15, attack: 8, release: 30 }),
  silence(80),
  tone(1047, 160, 0.45, { harmonic2: 0.15, attack: 8, release: 40 })
));

console.log('\nDone! Files written to hoscad-frontend/');
