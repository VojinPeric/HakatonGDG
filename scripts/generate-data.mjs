// Generates synthetic ECG records into public/data/.
// Each record contains 100,000 samples at ~360 Hz (~4.6 minutes) and ~250 labels.

import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'public', 'data');

const SAMPLES = 100_000;
const FS = 360; // sampling rate (Hz)
const CATEGORIES = ['N', 'S', 'V', 'F', 'Q'];

// Mulberry32 deterministic PRNG.
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Tiny gaussian-ish bump centered at `c` with width `w` and amplitude `a`.
function bump(t, c, w, a) {
  const x = (t - c) / w;
  return a * Math.exp(-x * x);
}

// Synthesize one PQRST complex sampled at offset `start` over `len` samples.
// Returns the full waveform shape array (length = len) and the R-peak index.
function complex(len, type, rand) {
  const out = new Float32Array(len);
  // Reference offsets within one beat (in samples), tuned for 360Hz.
  const Pc = Math.round(len * 0.18);
  const Qc = Math.round(len * 0.34);
  const Rc = Math.round(len * 0.4);
  const Sc = Math.round(len * 0.46);
  const Tc = Math.round(len * 0.7);

  // Default amplitudes (mV-ish).
  let pAmp = 0.12,
    qAmp = -0.18,
    rAmp = 1.1,
    sAmp = -0.32,
    tAmp = 0.28;
  let pW = len * 0.045,
    qW = len * 0.012,
    rW = len * 0.018,
    sW = len * 0.014,
    tW = len * 0.07;

  switch (type) {
    case 'S': // SVEB - early, narrow, abnormal P
      pAmp *= -0.6;
      tAmp *= 1.2;
      break;
    case 'V': // VEB - wide, tall, no P
      pAmp = 0;
      rAmp *= 1.45;
      sAmp *= 1.8;
      rW *= 2.4;
      sW *= 2.2;
      tAmp *= -0.7;
      break;
    case 'F': // Fusion
      rAmp *= 1.15;
      rW *= 1.6;
      tAmp *= 0.6;
      break;
    case 'Q': // Unknown / paced - blocky
      rAmp *= 0.6;
      qAmp *= 0.4;
      sAmp *= 0.4;
      pAmp *= 0.4;
      break;
    default: // N
      break;
  }

  // Tiny per-beat jitter so the trace looks organic.
  const j = () => (rand() - 0.5) * 0.04;
  for (let i = 0; i < len; i++) {
    let v = 0;
    v += bump(i, Pc, pW, pAmp);
    v += bump(i, Qc, qW, qAmp);
    v += bump(i, Rc, rW, rAmp);
    v += bump(i, Sc, sW, sAmp);
    v += bump(i, Tc, tW, tAmp);
    v += j();
    out[i] = v;
  }
  return { wave: out, rPeak: Rc };
}

function pickAbnormal(rand, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < CATEGORIES.length; i++) {
    r -= weights[i];
    if (r <= 0) return CATEGORIES[i];
  }
  return 'N';
}

function generateSignal(seed, profile) {
  const rand = rng(seed);
  const signal = new Float32Array(SAMPLES);
  const labels = [];

  // baseline wander: very-low-frequency drift.
  const driftFreq = 0.1 + rand() * 0.15; // Hz
  const driftAmp = 0.05;

  // Beat-to-beat distance (samples). 60 bpm => 360 samples; 90 bpm => 240.
  const baseRR = profile.baseRR; // mean RR in samples
  const rrJitter = profile.rrJitter; // +/- jitter

  let cursor = 0;
  while (cursor < SAMPLES) {
    const rr = Math.max(140, Math.round(baseRR + (rand() - 0.5) * 2 * rrJitter));
    const beatLen = rr;
    // Decide beat type using profile weights (defaults to N otherwise).
    const r = rand();
    let type = 'N';
    if (r < profile.abnormalRate) {
      type = pickAbnormal(rand, profile.abnormalWeights);
    }

    const { wave, rPeak } = complex(beatLen, type, rand);
    const writeLen = Math.min(beatLen, SAMPLES - cursor);
    for (let i = 0; i < writeLen; i++) {
      signal[cursor + i] = wave[i];
    }
    const peakIdx = cursor + rPeak;
    if (peakIdx < SAMPLES) {
      labels.push({
        index: peakIdx,
        type,
        timestamp: +(peakIdx / FS).toFixed(3),
      });
    }
    cursor += beatLen;
  }

  // Add baseline wander + Gaussian-ish noise.
  for (let i = 0; i < SAMPLES; i++) {
    const drift = driftAmp * Math.sin((2 * Math.PI * driftFreq * i) / FS);
    const noise = (rand() - 0.5) * 0.03;
    signal[i] += drift + noise;
  }

  return { signal: Array.from(signal, (v) => +v.toFixed(4)), labels };
}

const RECORDS = [
  {
    id: 'rec-001',
    patientName: 'Eleanor Whitaker',
    timestamp: '2026-04-22T09:14:00Z',
    riskLevel: 'high',
    seed: 11,
    profile: {
      baseRR: 260, // ~83 bpm
      rrJitter: 60, // irregular
      abnormalRate: 0.18,
      abnormalWeights: [0, 0.45, 0.4, 0.1, 0.05], // skews S/V (AFib-like)
    },
  },
  {
    id: 'rec-002',
    patientName: 'Marcus Delgado',
    timestamp: '2026-04-23T11:42:00Z',
    riskLevel: 'medium',
    seed: 23,
    profile: {
      baseRR: 360, // ~60 bpm
      rrJitter: 18,
      abnormalRate: 0.07,
      abnormalWeights: [0, 0.2, 0.5, 0.2, 0.1],
    },
  },
  {
    id: 'rec-003',
    patientName: 'Priya Ramachandran',
    timestamp: '2026-04-24T07:05:00Z',
    riskLevel: 'low',
    seed: 41,
    profile: {
      baseRR: 320, // ~67 bpm
      rrJitter: 10,
      abnormalRate: 0.02,
      abnormalWeights: [0, 0.5, 0.2, 0.2, 0.1],
    },
  },
  {
    id: 'rec-004',
    patientName: 'Hiroshi Tanaka',
    timestamp: '2026-04-24T15:30:00Z',
    riskLevel: 'medium',
    seed: 67,
    profile: {
      baseRR: 300, // ~72 bpm
      rrJitter: 25,
      abnormalRate: 0.11,
      abnormalWeights: [0, 0.15, 0.55, 0.2, 0.1],
    },
  },
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const indexPath = resolve(OUT_DIR, 'records.json');
  const index = RECORDS.map(({ id, patientName, timestamp, riskLevel }) => ({
    id,
    patientName,
    timestamp,
    riskLevel,
  }));
  await writeFile(indexPath, JSON.stringify(index, null, 2));

  for (const rec of RECORDS) {
    const filePath = resolve(OUT_DIR, `${rec.id}.json`);
    if (await exists(filePath)) {
      // Don't regenerate large files unnecessarily.
      console.log(`skip  ${rec.id} (already exists)`);
      continue;
    }
    const start = Date.now();
    const { signal, labels } = generateSignal(rec.seed, rec.profile);
    const payload = {
      id: rec.id,
      patientName: rec.patientName,
      timestamp: rec.timestamp,
      signal,
      labels,
    };
    await writeFile(filePath, JSON.stringify(payload));
    const ms = Date.now() - start;
    console.log(`wrote ${rec.id}.json  (${labels.length} labels, ${ms}ms)`);
  }
  console.log(`Done. Index at ${indexPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
