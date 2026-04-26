import { html } from '../vendor.js';
import { Brain, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';

export default function AiInsightsPanel({ insight }) {
  const confidencePct = Math.round(insight.confidence * 100);
  const isUrgent = insight.severity === 'urgent';
  return html`
    <aside
      className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-black/30"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <div
            className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-300/80"
          >
            <${Brain} className="h-3.5 w-3.5" /> AI insights
          </div>
          <h2 className="mt-1 text-lg font-semibold leading-tight text-slate-50">
            Proposed diagnosis
          </h2>
        </div>
        ${isUrgent
          ? html`<span
              className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-medium text-rose-300 ring-1 ring-rose-500/40"
            >
              <${ShieldAlert} className="h-3 w-3" /> Urgent
            </span>`
          : html`<span
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/30"
              >Routine</span
            >`}
      </header>

      <div>
        <p className="text-base font-medium text-slate-100">${insight.diagnosis}</p>
      </div>

      <div>
        <div
          className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-slate-500"
        >
          <span>Confidence</span>
          <span className="font-mono text-slate-300">${confidencePct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className=${`h-full rounded-full ${isUrgent ? 'bg-rose-400' : 'bg-cyan-400'}`}
            style=${{ width: `${confidencePct}%` }}
          ></div>
        </div>
      </div>

      <div>
        <div
          className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-slate-500"
        >
          <${Sparkles} className="h-3 w-3" /> Reasoning
        </div>
        <ul className="space-y-1.5 text-sm leading-relaxed text-slate-300">
          ${insight.reasoning.map(
            (line, i) => html`
              <li key=${i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-slate-500"></span>
                <span>${line}</span>
              </li>
            `,
          )}
        </ul>
      </div>

      <div className="border-t border-slate-800 pt-3">
        <div
          className="mb-3 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-slate-500"
        >
          <${TrendingUp} className="h-3 w-3" /> Clinical metrics
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <${Metric}
            label="Heart rate"
            value=${`${insight.metrics.bpm}`}
            unit="bpm"
            status=${insight.metrics.bpm < 50 || insight.metrics.bpm > 110
              ? 'danger'
              : insight.metrics.bpm < 60 || insight.metrics.bpm > 100
                ? 'warn'
                : 'ok'}
            hint=${insight.metrics.bpm < 60 ? 'Bradycardia' : insight.metrics.bpm > 100 ? 'Tachycardia' : 'Normal range'}
          />
          <${Metric}
            label="HRV (CV)"
            value=${`${(insight.metrics.variability * 100).toFixed(1)}`}
            unit="%"
            status=${insight.metrics.variability > 0.18 ? 'warn' : 'ok'}
            hint=${insight.metrics.variability > 0.18 ? 'Elevated variability' : 'Within limits'}
          />
          <${Metric}
            label="VEB burden"
            value=${`${(insight.metrics.vPct * 100).toFixed(1)}`}
            unit="%"
            status=${insight.metrics.vPct >= 0.04 ? 'danger' : insight.metrics.vPct >= 0.02 ? 'warn' : 'ok'}
            hint=${insight.metrics.vPct >= 0.04 ? 'Above threshold' : insight.metrics.vPct >= 0.02 ? 'Monitor' : 'Low risk'}
          />
          <${Metric}
            label="SVEB burden"
            value=${`${(insight.metrics.sPct * 100).toFixed(1)}`}
            unit="%"
            status=${insight.metrics.sPct >= 0.05 ? 'danger' : insight.metrics.sPct >= 0.03 ? 'warn' : 'ok'}
            hint=${insight.metrics.sPct >= 0.05 ? 'Above threshold' : insight.metrics.sPct >= 0.03 ? 'Monitor' : 'Low risk'}
          />
          <${Metric}
            label="Normal beats"
            value=${`${(insight.metrics.normalPct * 100).toFixed(1)}`}
            unit="%"
            status=${insight.metrics.normalPct < 0.85 ? 'warn' : 'ok'}
            hint=${`${insight.metrics.beats} total annotated`}
          />
          <${Metric}
            label="Ectopic burden"
            value=${`${(insight.metrics.ectopicPct * 100).toFixed(1)}`}
            unit="%"
            status=${insight.metrics.ectopicPct >= 0.1 ? 'danger' : insight.metrics.ectopicPct >= 0.04 ? 'warn' : 'ok'}
            hint=${insight.metrics.ectopicPct >= 0.1 ? 'High ectopy' : insight.metrics.ectopicPct >= 0.04 ? 'Moderate' : 'Minimal'}
          />
        </dl>
      </div>
    </aside>
  `;
}

function Metric({ label, value, unit, status, hint }) {
  const colors = {
    ok: 'text-emerald-400',
    warn: 'text-amber-400',
    danger: 'text-rose-400',
  };
  const rings = {
    ok: 'ring-slate-700/50',
    warn: 'ring-amber-500/25',
    danger: 'ring-rose-500/25',
  };
  const dots = {
    ok: 'bg-emerald-400',
    warn: 'bg-amber-400',
    danger: 'bg-rose-400',
  };
  return html`
    <div className=${`rounded-lg bg-slate-800/50 px-3 py-2.5 ring-1 ${rings[status]}`}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">${label}</span>
        <span className=${`h-1.5 w-1.5 rounded-full ${dots[status]}`}></span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className=${`font-mono text-lg font-semibold leading-none ${colors[status]}`}>${value}</span>
        <span className="text-[11px] text-slate-500">${unit}</span>
      </div>
      ${hint
        ? html`<div className="mt-1 text-[10px] text-slate-600">${hint}</div>`
        : null}
    </div>
  `;
}
