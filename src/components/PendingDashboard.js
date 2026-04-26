import { React, html } from '../vendor.js';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Stethoscope,
} from 'lucide-react';
import { useApp } from '../context/AppContext.js';
import RiskBadge from './RiskBadge.js';

const { useEffect, useMemo, useState } = React;

function formatTimestamp(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function PendingDashboard() {
  const { openRecord, signedOff } = useApp();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/public/data/records.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setRecords(data);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) => r.patientName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q),
    );
  }, [records, query]);

  const stats = useMemo(() => {
    const pending = records.filter((r) => !signedOff.has(r.id));
    return {
      pending: pending.length,
      high: pending.filter((r) => r.riskLevel === 'high').length,
      done: signedOff.size,
    };
  }, [records, signedOff]);

  const handleProcess = async (record) => {
    setOpening(record.id);
    try {
      const res = await fetch(`/public/data/${record.id}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const full = await res.json();
      openRecord({ ...full, riskLevel: record.riskLevel });
    } catch (e) {
      setError(`Failed to load ${record.id}: ${e.message}`);
    } finally {
      setOpening(null);
    }
  };

  return html`
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div
            className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300/80"
          >
            <${Stethoscope} className="h-3.5 w-3.5" /> Pending review
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
            ECG records awaiting cardiologist sign-off
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Each record has been pre-annotated. Open one to verify the AI's findings and finalize a
            diagnosis.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <${Stat}
            label="Pending"
            value=${stats.pending}
            icon=${html`<${Clock} className="h-3.5 w-3.5" />`}
          />
          <${Stat}
            label="High risk"
            value=${stats.high}
            tone="rose"
            icon=${html`<${RefreshCw} className="h-3.5 w-3.5" />`}
          />
          <${Stat}
            label="Signed off"
            value=${stats.done}
            tone="emerald"
            icon=${html`<${CheckCircle2} className="h-3.5 w-3.5" />`}
          />
        </div>
      </div>

      <div
        className="mb-4 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 ring-1 ring-slate-800/60 focus-within:border-cyan-500/40"
      >
        <${Search} className="h-4 w-4 text-slate-500" />
        <input
          value=${query}
          onChange=${(e) => setQuery(e.target.value)}
          placeholder="Search by patient name or record id"
          className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
      </div>

      ${error
        ? html`<div
            className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
          >
            ${error}
          </div>`
        : null}

      <div
        className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 shadow-xl shadow-black/30"
      >
        <div
          className="grid grid-cols-12 gap-4 border-b border-slate-800/80 bg-slate-900/60 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500"
        >
          <div className="col-span-4">Patient</div>
          <div className="col-span-2">Record</div>
          <div className="col-span-3">Captured</div>
          <div className="col-span-2">Risk</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        ${loading
          ? html`<div
              className="flex items-center justify-center px-4 py-16 text-sm text-slate-400"
            >
              <${Loader2} className="mr-2 h-4 w-4 animate-spin" /> Loading records...
            </div>`
          : filtered.length === 0
            ? html`<div className="px-4 py-16 text-center text-sm text-slate-500">
                No records match.
              </div>`
            : html`<ul className="divide-y divide-slate-800/70">
                ${filtered.map((rec) => {
                  const done = signedOff.has(rec.id);
                  return html`
                    <li
                      key=${rec.id}
                      className="grid grid-cols-12 items-center gap-4 px-4 py-3 transition hover:bg-slate-800/30"
                    >
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <${Avatar} name=${rec.patientName} />
                          <div>
                            <div className="text-sm font-medium text-slate-100">
                              ${rec.patientName}
                            </div>
                            <div className="text-xs text-slate-500">
                              ${done ? 'Signed off' : 'Awaiting review'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 font-mono text-xs text-slate-400">
                        ${rec.id}
                      </div>
                      <div className="col-span-3 text-sm text-slate-300">
                        ${formatTimestamp(rec.timestamp)}
                      </div>
                      <div className="col-span-2"><${RiskBadge} level=${rec.riskLevel} /></div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick=${() => handleProcess(rec)}
                          disabled=${opening === rec.id}
                          className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-200 ring-1 ring-cyan-400/30 transition hover:bg-cyan-500/25 hover:text-cyan-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          ${opening === rec.id
                            ? html`<${Loader2} className="h-3.5 w-3.5 animate-spin" />`
                            : done
                              ? html`Reopen <${ArrowRight} className="h-3.5 w-3.5" />`
                              : html`Process <${ArrowRight} className="h-3.5 w-3.5" />`}
                        </button>
                      </div>
                    </li>
                  `;
                })}
              </ul>`}
      </div>
    </div>
  `;
}

function Stat({ label, value, tone = 'slate', icon }) {
  const tones = {
    slate: 'bg-slate-800/60 text-slate-200 ring-slate-700/60',
    rose: 'bg-rose-500/10 text-rose-200 ring-rose-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-200 ring-emerald-500/30',
  };
  return html`
    <div className=${`inline-flex items-center gap-2 rounded-lg px-3 py-2 ring-1 ${tones[tone]}`}>
      ${icon}
      <span className="font-mono text-sm tabular-nums">${value}</span>
      <span className="text-[11px] uppercase tracking-[0.14em] text-current/70">${label}</span>
    </div>
  `;
}

function Avatar({ name }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return html`
    <div
      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300 ring-1 ring-slate-700"
    >
      ${initials}
    </div>
  `;
}
