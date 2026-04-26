import { React, html } from '../vendor.js';
import { Maximize2, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_BY_TYPE, SAMPLE_RATE_HZ } from '../constants/categories.js';
import useCanvasDpr from '../hooks/useCanvasDpr.js';
import { drawBaseline, drawGrid, drawSignal, fitScale } from '../utils/ecgRender.js';

const { useEffect, useMemo, useRef, useState } = React;
const HALF_WIN = 150;

// ─── small canvas inside a beat card ────────────────────────────────────────
function BeatMiniCanvas({ signal, label }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const { width: cssW, height: cssH, dpr } = useCanvasDpr(containerRef);

  const view = useMemo(() => {
    const start = Math.max(0, label.index - HALF_WIN);
    const end = Math.min(signal.length, label.index + HALF_WIN);
    return { start, samples: end - start, peakOffset: label.index - start };
  }, [label.index, signal.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cssW <= 0) return;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { yScale, baseline } = fitScale(signal, view.start, view.samples, cssH);
    drawGrid(ctx, cssW, cssH, { minor: 10, majorEvery: 5 });
    drawBaseline(ctx, cssW, cssH);
    drawSignal(ctx, signal, view.start, view.samples, cssW, cssH, yScale, baseline);

    const cat = CATEGORY_BY_TYPE[label.type];
    const peakX = (view.peakOffset / view.samples) * cssW;

    ctx.strokeStyle = `${cat.hex}77`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(peakX + 0.5, 20);
    ctx.lineTo(peakX + 0.5, cssH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = cat.hex;
    ctx.beginPath();
    ctx.arc(peakX, 11, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0f1a';
    ctx.font = '700 9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.type, peakX, 11);
  }, [signal, view, cssW, cssH, dpr, label.type]);

  return html`
    <div ref=${containerRef} className="h-32 w-full">
      <canvas ref=${canvasRef} className="block h-full w-full" />
    </div>
  `;
}

// ─── large expanded canvas overlay ──────────────────────────────────────────
function ExpandedBeatView({ signal, label, labelIndex, initialType, onClose, onRelabel, onPrev, onNext, hasPrev, hasNext }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const { width: cssW, height: cssH, dpr } = useCanvasDpr(containerRef);
  const HALF = 250;

  const view = useMemo(() => {
    const start = Math.max(0, label.index - HALF);
    const end = Math.min(signal.length, label.index + HALF);
    return { start, samples: end - start, peakOffset: label.index - start };
  }, [label.index, signal.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cssW <= 0) return;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { yScale, baseline } = fitScale(signal, view.start, view.samples, cssH);
    drawGrid(ctx, cssW, cssH, { minor: 16, majorEvery: 5 });
    drawBaseline(ctx, cssW, cssH);
    drawSignal(ctx, signal, view.start, view.samples, cssW, cssH, yScale, baseline);

    const cat = CATEGORY_BY_TYPE[label.type];
    const peakX = (view.peakOffset / view.samples) * cssW;

    ctx.strokeStyle = `${cat.hex}aa`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(peakX + 0.5, 28);
    ctx.lineTo(peakX + 0.5, cssH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = cat.hex;
    ctx.beginPath();
    ctx.arc(peakX, 16, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0f1a';
    ctx.font = '700 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.type, peakX, 16);
  }, [signal, view, cssW, cssH, dpr, label.type]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); onNext(); return; }
      const k = (e.key || '').toUpperCase();
      if (['N', 'S', 'V', 'F', 'Q'].includes(k)) onRelabel(labelIndex, k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, onRelabel, labelIndex]);

  const timeSec = (label.index / SAMPLE_RATE_HZ).toFixed(3);
  const cat = CATEGORY_BY_TYPE[label.type];
  const wasRelabeled = label.type !== initialType;

  return html`
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-4 py-6 backdrop-blur-sm"
      onClick=${onClose}
    >
      <div
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick=${(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className=${`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-bold ${cat.badgeClass}`}>
              ${cat.type} · ${cat.label}
            </span>
            <span className="font-mono text-xs text-slate-400">${timeSec}s</span>
            ${wasRelabeled ? html`<span className="text-[10px] text-amber-400">relabeled</span>` : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick=${onPrev}
              disabled=${!hasPrev}
              className="rounded px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 disabled:opacity-30"
            >← Prev</button>
            <button
              type="button"
              onClick=${onNext}
              disabled=${!hasNext}
              className="rounded px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 disabled:opacity-30"
            >Next →</button>
            <button
              type="button"
              onClick=${onClose}
              className="ml-1 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
            ><${X} className="h-4 w-4" /></button>
          </div>
        </header>

        <div ref=${containerRef} className="h-80 w-full">
          <canvas ref=${canvasRef} className="block h-full w-full" />
        </div>

        <div className="border-t border-slate-800 px-5 py-3">
          <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">Relabel as</div>
          <div className="flex gap-2">
            ${CATEGORIES.map((c) => {
              const active = c.type === label.type;
              return html`
                <button
                  key=${c.type}
                  type="button"
                  onClick=${() => onRelabel(labelIndex, c.type)}
                  className=${`flex-1 rounded-md py-2 font-mono text-sm font-bold transition ${
                    active ? `${c.badgeClass} ring-2 ring-offset-2 ring-offset-slate-900` : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >${c.type}</button>
              `;
            })}
          </div>
          <p className="mt-2 text-[10px] text-slate-600">← → navigate · N S V F Q relabel · Esc close</p>
        </div>
      </div>
    </div>
  `;
}

// ─── beat card in the grid ───────────────────────────────────────────────────
function BeatCard({ signal, label, labelIndex, initialType, onRelabel, focused, onFocus, onExpand }) {
  const timeSec = (label.index / SAMPLE_RATE_HZ).toFixed(2);
  const cat = CATEGORY_BY_TYPE[label.type];
  const wasRelabeled = label.type !== initialType;

  return html`
    <div
      tabIndex=${0}
      onClick=${onFocus}
      onFocus=${onFocus}
      className=${`group flex flex-col overflow-hidden rounded-xl border transition-all cursor-pointer ${
        focused
          ? 'border-cyan-500/60 ring-2 ring-cyan-500/25 bg-slate-900'
          : 'border-slate-800 hover:border-slate-600 bg-slate-900/70'
      }`}
    >
      <div className="relative">
        <${BeatMiniCanvas} signal=${signal} label=${label} />
        <button
          type="button"
          title="Expand"
          onClick=${(e) => { e.stopPropagation(); onExpand(); }}
          className="absolute right-1.5 top-1.5 rounded-md bg-slate-900/70 p-1 text-slate-400 opacity-0 transition hover:bg-slate-800 hover:text-slate-100 group-hover:opacity-100"
        >
          <${Maximize2} className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-col gap-2 p-2.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-slate-400">${timeSec}s</span>
          ${wasRelabeled
            ? html`<span className=${`inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold ${cat.badgeClass}`}>${label.type}</span>`
            : null}
        </div>
        <div className="flex gap-1">
          ${CATEGORIES.map((c) => {
            const active = c.type === label.type;
            return html`
              <button
                key=${c.type}
                type="button"
                title=${c.label}
                onClick=${(e) => { e.stopPropagation(); onRelabel(labelIndex, c.type); }}
                className=${`flex-1 rounded py-1 font-mono text-[10px] font-bold transition ${
                  active ? c.badgeClass : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >${c.type}</button>
            `;
          })}
        </div>
      </div>
    </div>
  `;
}

// ─── main modal ──────────────────────────────────────────────────────────────
export default function GroupReviewModal({ record, categoryType, onClose, onRelabel }) {
  const cat = CATEGORY_BY_TYPE[categoryType];

  const [entries] = useState(() =>
    record.labels
      .map((_, i) => ({ globalIdx: i }))
      .filter((_, i) => record.labels[i].type === categoryType),
  );

  const [focusedPos, setFocusedPos] = useState(0);
  const [expandedPos, setExpandedPos] = useState(null);

  // Grid keyboard nav (only when no expanded view is open)
  useEffect(() => {
    if (expandedPos !== null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedPos((p) => Math.min(p + 1, entries.length - 1));
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedPos((p) => Math.max(p - 1, 0));
        return;
      }
      if (e.key === 'Enter') { setExpandedPos(focusedPos); return; }
      const k = (e.key || '').toUpperCase();
      if (['N', 'S', 'V', 'F', 'Q'].includes(k) && entries[focusedPos]) {
        onRelabel(entries[focusedPos].globalIdx, k);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onRelabel, entries, focusedPos, expandedPos]);

  if (!entries.length) {
    return html`
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
        onClick=${onClose}
      >
        <div
          className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center shadow-2xl"
          onClick=${(e) => e.stopPropagation()}
        >
          <p className="text-slate-400">
            No beats in the <span className="mx-1 font-mono font-bold text-slate-200">${categoryType}</span> group.
          </p>
          <button onClick=${onClose} className="mt-4 text-sm text-cyan-400 hover:text-cyan-300">Close</button>
        </div>
      </div>
    `;
  }

  const expandedEntry = expandedPos !== null ? entries[expandedPos] : null;

  return html`
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm"
      onClick=${onClose}
    >
      <div
        className="flex h-full max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/60"
        onClick=${(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className=${`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${cat.badgeClass}`}>
              <span className=${`h-2 w-2 rounded-full ${cat.dotClass}`}></span>
              <span className="font-mono">${cat.type}</span>
              <span>${cat.label}</span>
            </span>
            <span className="text-sm text-slate-400">
              ${entries.length} beat${entries.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            type="button"
            onClick=${onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
          ><${X} className="h-4 w-4" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            ${entries.map(({ globalIdx }, pos) => {
              const currentLabel = record.labels[globalIdx];
              return html`
                <${BeatCard}
                  key=${globalIdx}
                  signal=${record.signal}
                  label=${currentLabel}
                  labelIndex=${globalIdx}
                  initialType=${categoryType}
                  onRelabel=${onRelabel}
                  focused=${focusedPos === pos}
                  onFocus=${() => setFocusedPos(pos)}
                  onExpand=${() => setExpandedPos(pos)}
                />
              `;
            })}
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-800 px-5 py-2.5 text-[11px] text-slate-500">
          Click to focus · Enter or hover → expand · ← → navigate · N S V F Q relabel · Esc close
        </footer>
      </div>
    </div>

    ${expandedEntry !== null
      ? html`<${ExpandedBeatView}
          signal=${record.signal}
          label=${record.labels[expandedEntry.globalIdx]}
          labelIndex=${expandedEntry.globalIdx}
          initialType=${categoryType}
          onClose=${() => setExpandedPos(null)}
          onRelabel=${onRelabel}
          onPrev=${() => setExpandedPos((p) => Math.max(0, p - 1))}
          onNext=${() => setExpandedPos((p) => Math.min(entries.length - 1, p + 1))}
          hasPrev=${expandedPos > 0}
          hasNext=${expandedPos < entries.length - 1}
        />`
      : null}
  `;
}
