// Deterministic mock AI diagnosis derived from the record's labels so each
// patient looks distinct without any real inference.

import { CATEGORY_TYPES } from '../constants/categories.js';

function counts(labels) {
  const c = Object.fromEntries(CATEGORY_TYPES.map((t) => [t, 0]));
  for (const l of labels) c[l.type] = (c[l.type] || 0) + 1;
  return c;
}

function meanRrSamples(labels) {
  if (labels.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < labels.length; i++) sum += labels[i].index - labels[i - 1].index;
  return sum / (labels.length - 1);
}

function rrVariability(labels) {
  if (labels.length < 3) return 0;
  const rrs = [];
  for (let i = 1; i < labels.length; i++) rrs.push(labels[i].index - labels[i - 1].index);
  const mean = rrs.reduce((a, b) => a + b, 0) / rrs.length;
  let v = 0;
  for (const r of rrs) v += (r - mean) ** 2;
  return Math.sqrt(v / rrs.length) / mean;
}

export function inferDiagnosis(record) {
  const c = counts(record.labels);
  const total = record.labels.length || 1;
  const sPct = c.S / total;
  const vPct = c.V / total;
  const fPct = c.F / total;
  const meanRr = meanRrSamples(record.labels);
  const bpm = meanRr ? Math.round((360 * 60) / meanRr) : 0;
  const variability = rrVariability(record.labels);

  let diagnosis = 'Normal sinus rhythm';
  let severity = 'routine';
  const reasoning = [];

  if (sPct > 0.05 && variability > 0.18) {
    diagnosis = 'Atrial fibrillation suspected';
    severity = 'urgent';
    reasoning.push(
      `Frequent supraventricular ectopy (${(sPct * 100).toFixed(1)}% of beats) with high RR variability (${(variability * 100).toFixed(0)}%).`,
    );
  } else if (vPct > 0.04) {
    diagnosis = 'Frequent ventricular ectopy';
    severity = 'urgent';
    reasoning.push(
      `Ventricular ectopic burden of ${(vPct * 100).toFixed(1)}% exceeds the 4% clinical threshold.`,
    );
  } else if (fPct > 0.02) {
    diagnosis = 'Intermittent fusion beats';
    severity = 'routine';
    reasoning.push(`Fusion beats observed at ${(fPct * 100).toFixed(1)}% prevalence.`);
  } else if (bpm < 55) {
    diagnosis = 'Sinus bradycardia';
    severity = 'routine';
    reasoning.push(`Mean heart rate ${bpm} bpm is below the lower normal bound.`);
  } else if (bpm > 95) {
    diagnosis = 'Sinus tachycardia';
    severity = 'routine';
    reasoning.push(`Mean heart rate ${bpm} bpm is above the upper normal bound.`);
  } else {
    reasoning.push(`Predominantly normal beats (${((c.N / total) * 100).toFixed(1)}%).`);
    reasoning.push(`Mean heart rate ${bpm} bpm is within normal limits.`);
  }

  reasoning.push(
    `Beat distribution - N:${c.N} S:${c.S} V:${c.V} F:${c.F} Q:${c.Q} across ${total} annotated beats.`,
  );

  // Confidence: 65-97% deterministic from severity and counts.
  const base = severity === 'urgent' ? 0.78 : 0.86;
  const noise = ((record.id?.charCodeAt(record.id.length - 1) || 0) % 11) / 100;
  const confidence = Math.min(0.97, Math.max(0.65, base + noise));

  return {
    diagnosis,
    severity,
    reasoning,
    confidence,
    metrics: {
      bpm,
      variability,
      sPct,
      vPct,
      fPct,
      beats: total,
      normalPct: c.N / total,
      ectopicPct: (c.S + c.V + c.F) / total,
    },
  };
}
