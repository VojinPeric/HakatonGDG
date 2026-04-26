import { React, html } from '../vendor.js';
import {
  ArrowLeft,
  ClipboardCheck,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { CATEGORIES, CATEGORY_TYPES, SAMPLE_RATE_HZ } from '../constants/categories.js';
import { useApp } from '../context/AppContext.js';
import useEcgViewport from '../hooks/useEcgViewport.js';
import { inferDiagnosis } from '../utils/mockAi.js';
import AiInsightsPanel from './AiInsightsPanel.js';
import EcgCanvas from './EcgCanvas.js';
import GroupReviewModal from './GroupReviewModal.js';
import ImpulseZoomModal from './ImpulseZoomModal.js';
import NavigationTrack from './NavigationTrack.js';
import RiskBadge from './RiskBadge.js';
import SignOffModal from './SignOffModal.js';
import SuccessToast from './SuccessToast.js';

const { useEffect, useMemo, useState } = React;
const DEFAULT_VIEW_SAMPLES = 4 * SAMPLE_RATE_HZ;

export default function ReviewStation() {
  const { currentRecord, closeRecord, relabel, completeSignOff, signedOff } = useApp();
  const record = currentRecord;

  const total = record?.signal.length ?? 0;
  const { viewport, setStart, panBy, zoomAt, setSamplesPerView } = useEcgViewport(
    total,
    DEFAULT_VIEW_SAMPLES,
  );

  const [activeLabelIdx, setActiveLabelIdx] = useState(null);
  const [reviewGroupType, setReviewGroupType] = useState(null);
  const [signOffOpen, setSignOffOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const insight = useMemo(() => (record ? inferDiagnosis(record) : null), [record]);

  const labelCounts = useMemo(() => {
    const c = Object.fromEntries(CATEGORY_TYPES.map((t) => [t, 0]));
    if (!record) return c;
    for (const l of record.labels) c[l.type] = (c[l.type] || 0) + 1;
    return c;
  }, [record]);

  const handleSignOffSubmit = (payload) => {
    setSignOffOpen(false);
    setShowSuccess(true);
    window.setTimeout(() => {
      setShowSuccess(false);
      completeSignOff(payload);
    }, 1300);
  };

  useEffect(() => {
    setActiveLabelIdx(null);
  }, [record?.id]);

  if (!record || !insight) {
    return html`
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Loading record...
      </div>
    `;
  }

  const startSec = (viewport.startIndex / SAMPLE_RATE_HZ).toFixed(2);
  const endSec = ((viewport.startIndex + viewport.samplesPerView) / SAMPLE_RATE_HZ).toFixed(2);
  const windowSec = (viewport.samplesPerView / SAMPLE_RATE_HZ).toFixed(2);

  return html`
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-5 py-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick=${closeRecord}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-slate-700 hover:text-slate-100"
          >
            <${ArrowLeft} className="h-3.5 w-3.5" /> Dashboard
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-50">${record.patientName}</h1>
              <${RiskBadge} level=${record.riskLevel ?? 'low'} />
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              <span className="font-mono">${record.id}</span>
              <span className="mx-1.5">·</span>
              ${new Date(record.timestamp).toLocaleString()}
              <span className="mx-1.5">·</span>
              ${(record.signal.length / SAMPLE_RATE_HZ / 60).toFixed(1)} min recording
            </div>
          </div>
        </div>
        ${signedOff.has(record.id)
          ? html`<span
              className="inline-flex items-center gap-2 rounded-md bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300 ring-1 ring-emerald-500/30"
            >
              <${ClipboardCheck} className="h-4 w-4" /> Signed off
            </span>`
          : html`<button
              type="button"
              onClick=${() => setSignOffOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-md shadow-cyan-500/20 transition hover:bg-cyan-400"
            >
              <${ClipboardCheck} className="h-4 w-4" /> Sign-off
            </button>`}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div
          className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 shadow-xl shadow-black/30"
        >
          <div className="flex items-center justify-end gap-1.5">
            <${ToolButton} onClick=${() => zoomAt(1 / 1.4, 0.5)} title="Zoom in">
              <${Plus} className="h-3.5 w-3.5" />
            <//>
            <${ToolButton} onClick=${() => zoomAt(1.4, 0.5)} title="Zoom out">
              <${Minus} className="h-3.5 w-3.5" />
            <//>
            <${ToolButton}
              onClick=${() => setSamplesPerView(DEFAULT_VIEW_SAMPLES)}
              title="Reset zoom"
            >
              <${RotateCcw} className="h-3.5 w-3.5" />
            <//>
          </div>

          <${EcgCanvas}
            signal=${record.signal}
            labels=${record.labels}
            viewport=${viewport}
            visibleTypes=${CATEGORY_TYPES}
            onPan=${(d) => panBy(d)}
            onZoom=${(f, anchor) => zoomAt(f, anchor)}
            onLabelClick=${(idx) => setActiveLabelIdx(idx)}
            height=${340}
            yScale=${90}
          />

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <div className="font-mono">
              ${startSec}s → ${endSec}s · window ${windowSec}s ·
              ${viewport.samplesPerView.toLocaleString()} samples
            </div>
            <div className="hidden md:block">
              Drag to pan · scroll to zoom · click a label to inspect
            </div>
          </div>

          <${NavigationTrack}
            signal=${record.signal}
            viewport=${viewport}
            onSeek=${setStart}
          />

          <div className="border-t border-slate-800/60 pt-3">
            <div className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
              Review group
            </div>
            <div className="grid grid-cols-5 gap-2">
              ${CATEGORIES.map((cat) => {
                const count = labelCounts[cat.type] ?? 0;
                const active = count > 0;
                return html`
                  <button
                    key=${cat.type}
                    type="button"
                    onClick=${() => active && setReviewGroupType(cat.type)}
                    disabled=${!active}
                    title=${active ? `Review ${count} ${cat.label} beat${count !== 1 ? 's' : ''}` : `No ${cat.label} beats`}
                    className=${`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition ${
                      active
                        ? 'cursor-pointer border-slate-700/80 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                        : 'cursor-not-allowed border-slate-800/50 bg-slate-900/30 opacity-40'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span
                        className=${`inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold ${active ? cat.badgeClass : 'bg-slate-800 text-slate-600'}`}
                      >${cat.type}</span>
                      <span
                        className=${`font-mono text-lg font-bold tabular-nums leading-none ${active ? 'text-slate-100' : 'text-slate-600'}`}
                      >${count}</span>
                    </div>
                    <div className=${`text-[11px] leading-tight ${active ? 'text-slate-400' : 'text-slate-600'}`}>
                      ${cat.label}
                    </div>
                  </button>
                `;
              })}
            </div>
          </div>
        </div>

        <${AiInsightsPanel} insight=${insight} />
      </div>

      ${reviewGroupType !== null
        ? html`<${GroupReviewModal}
            record=${record}
            categoryType=${reviewGroupType}
            onClose=${() => setReviewGroupType(null)}
            onRelabel=${relabel}
          />`
        : null}

      ${activeLabelIdx !== null
        ? html`<${ImpulseZoomModal}
            record=${record}
            labelIndex=${activeLabelIdx}
            onClose=${() => setActiveLabelIdx(null)}
            onRelabel=${(t) => relabel(activeLabelIdx, t)}
          />`
        : null}

      ${signOffOpen
        ? html`<${SignOffModal}
            record=${record}
            insight=${insight}
            onCancel=${() => setSignOffOpen(false)}
            onSubmit=${handleSignOffSubmit}
          />`
        : null}

      ${showSuccess
        ? html`<${SuccessToast} title="Sign-off recorded" subtitle="Returning to dashboard…" />`
        : null}
    </div>
  `;
}

function ToolButton({ children, onClick, title }) {
  return html`
    <button
      type="button"
      onClick=${onClick}
      title=${title}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-800 bg-slate-900/60 text-slate-300 transition hover:border-slate-700 hover:text-slate-100"
    >
      ${children}
    </button>
  `;
}
