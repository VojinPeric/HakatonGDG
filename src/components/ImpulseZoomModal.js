import { React, html } from '../vendor.js';
import { Check, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_BY_TYPE, SAMPLE_RATE_HZ } from '../constants/categories.js';
import useCanvasDpr from '../hooks/useCanvasDpr.js';
import { drawBaseline, drawGrid, drawSignal, fitScale } from '../utils/ecgRender.js';

const { useEffect, useMemo, useRef } = React;
const ZOOM_HALF_SAMPLES = 200;

export default function ImpulseZoomModal({ record, labelIndex, onClose, onRelabel }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const { width: cssW, height: cssH, dpr } = useCanvasDpr(containerRef);

  const label = record.labels[labelIndex];

  const view = useMemo(() => {
    if (!label) return { start: 0, samples: 1, peakOffset: 0 };
    const start = Math.max(0, label.index - ZOOM_HALF_SAMPLES);
    const end = Math.min(record.signal.length, label.index + ZOOM_HALF_SAMPLES);
    return { start, samples: end - start, peakOffset: label.index - start };
  }, [label, record.signal.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cssW <= 0 || !label) return;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { yScale, baseline } = fitScale(record.signal, view.start, view.samples, cssH);
    drawGrid(ctx, cssW, cssH, { minor: 16, majorEvery: 5 });
    drawBaseline(ctx, cssW, cssH);
    drawSignal(ctx, record.signal, view.start, view.samples, cssW, cssH, yScale, baseline);

    const peakX = (view.peakOffset / view.samples) * cssW;
    const cat = CATEGORY_BY_TYPE[label.type];
    ctx.strokeStyle = `${cat.hex}aa`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(peakX + 0.5, 24);
    ctx.lineTo(peakX + 0.5, cssH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = cat.hex;
    ctx.beginPath();
    ctx.arc(peakX, 14, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0f1a';
    ctx.font = '700 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.type, peakX, 14);
  }, [record.signal, view, cssW, cssH, dpr, label]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      const k = (e.key || '').toUpperCase();
      if (['N', 'S', 'V', 'F', 'Q'].includes(k)) onRelabel(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onRelabel]);

  if (!label) return null;
  const seconds = (label.index / SAMPLE_RATE_HZ).toFixed(3);
  const cat = CATEGORY_BY_TYPE[label.type];

  return html`
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm animate-fadeIn"
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/60 animate-slideUp"
      >
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/80">
              Impulse zoom
            </div>
            <h3 className="mt-1 text-base font-semibold text-slate-50">
              Beat at sample
              <span className="ml-1 font-mono text-slate-300">${label.index.toLocaleString()}</span>
              <span className="mx-2 text-slate-500">·</span>
              <span className="font-mono text-slate-400">${seconds}s</span>
            </h3>
          </div>
          <button
            type="button"
            onClick=${onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
          >
            <${X} className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 py-4">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
            <span
              >Current label:
              <span
                className=${`ml-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono ${cat.badgeClass}`}
                >${label.type} · ${cat.label}</span
              ></span
            >
            <span className="text-slate-500"
              >Window ±${ZOOM_HALF_SAMPLES} samples (~${(
                (ZOOM_HALF_SAMPLES * 2) /
                SAMPLE_RATE_HZ
              ).toFixed(2)}s)</span
            >
          </div>

          <div ref=${containerRef} className="relative h-80 w-full">
            <canvas ref=${canvasRef} className="block h-full w-full rounded-lg" />
          </div>

          <div className="mt-5">
            <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Relabel as
            </div>
            <div className="flex flex-wrap gap-2">
              ${CATEGORIES.map((c) => {
                const active = c.type === label.type;
                const cls = active
                  ? `${c.badgeClass} ring-2 ring-offset-2 ring-offset-slate-900`
                  : 'bg-slate-800/60 text-slate-300 ring-1 ring-slate-700/60 hover:bg-slate-800 hover:text-slate-100';
                return html`
                  <button
                    key=${c.type}
                    type="button"
                    onClick=${() => onRelabel(c.type)}
                    className=${`group inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${cls}`}
                  >
                    <span className=${`h-2 w-2 rounded-full ${c.dotClass}`}></span>
                    <span className="font-mono">${c.type}</span>
                    <span className="text-xs text-current/80">${c.label}</span>
                    ${active ? html`<${Check} className="h-3.5 w-3.5" />` : null}
                  </button>
                `;
              })}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              Tip: press N / S / V / F / Q to relabel, Esc to close.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}
