// Pure rendering helpers for the primary and zoom ECG canvases.
// Caller is expected to have already scaled the context for DPR; widths/heights
// passed to these functions are in CSS pixels.

const COLORS = {
  bg: '#0a0f1a',
  gridMinor: 'rgba(244, 63, 94, 0.07)', // soft red, like ECG paper
  gridMajor: 'rgba(244, 63, 94, 0.18)',
  axis: 'rgba(148, 163, 184, 0.3)',
  trace: '#22d3ee', // cyan-400
  traceShadow: 'rgba(34, 211, 238, 0.18)',
};

// Draws a 1mm-style grid: small cell every `minor` px, bold every `majorEvery`
// minor cells. Defaults give a clean medical look at typical viewport sizes.
export function drawGrid(ctx, width, height, opts = {}) {
  const minor = opts.minor ?? 10;
  const majorEvery = opts.majorEvery ?? 5;

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.gridMinor;
  ctx.beginPath();
  for (let x = 0; x <= width; x += minor) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = 0; y <= height; y += minor) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();

  ctx.strokeStyle = COLORS.gridMajor;
  ctx.beginPath();
  const major = minor * majorEvery;
  for (let x = 0; x <= width; x += major) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = 0; y <= height; y += major) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();
}

// Draws the signal between sample indices [start, start+samples) into the
// rectangle [0,0,width,height]. yScale is mV-per-pixel (positive flips up).
// When samples > width, draws a min/max envelope per pixel column.
// Pass a pre-computed `baseline` (y-coord of the zero line) to override the default height/2.
export function drawSignal(ctx, signal, start, samples, width, height, yScale, baseline) {
  const bl = baseline !== undefined ? baseline : height / 2;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = COLORS.trace;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Soft glow layer.
  ctx.shadowColor = COLORS.traceShadow;
  ctx.shadowBlur = 6;

  ctx.beginPath();
  if (samples <= 0) {
    ctx.stroke();
    ctx.shadowBlur = 0;
    return;
  }

  if (samples <= width) {
    // 1:N case - draw each sample as a vertex.
    const step = width / samples;
    for (let i = 0; i < samples; i++) {
      const idx = start + i;
      if (idx < 0 || idx >= signal.length) continue;
      const x = i * step;
      const y = bl - signal[idx] * yScale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  } else {
    // N:1 case - per-column min/max envelope.
    const samplesPerCol = samples / width;
    for (let col = 0; col < width; col++) {
      const s0 = start + Math.floor(col * samplesPerCol);
      const s1 = Math.min(signal.length, start + Math.floor((col + 1) * samplesPerCol));
      if (s0 >= signal.length) break;
      let mn = signal[s0];
      let mx = mn;
      for (let i = s0 + 1; i < s1; i++) {
        const v = signal[i];
        if (v < mn) mn = v;
        else if (v > mx) mx = v;
      }
      const yMin = bl - mx * yScale;
      const yMax = bl - mn * yScale;
      if (col === 0) ctx.moveTo(col, yMin);
      ctx.lineTo(col, yMin);
      ctx.lineTo(col, yMax);
    }
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// Renders an axis baseline tick.
export function drawBaseline(ctx, width, height) {
  ctx.strokeStyle = COLORS.axis;
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2 + 0.5);
  ctx.lineTo(width, height / 2 + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
}

// Compute yScale + baseline so the signal window fills the canvas height with padding.
export function fitScale(signal, start, samples, height, padding = 0.1) {
  let mn = Infinity;
  let mx = -Infinity;
  const end = Math.min(signal.length, start + samples);
  for (let i = Math.max(0, start); i < end; i++) {
    const v = signal[i];
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  if (!isFinite(mn) || mn >= mx) return { yScale: height * 0.3, baseline: height / 2 };
  const yScale = (height * (1 - 2 * padding)) / (mx - mn);
  // baseline: canvas y-coord where signal value 0 lands
  const baseline = height * (1 - padding) + mn * yScale;
  return { yScale, baseline };
}

export const ECG_COLORS = COLORS;
