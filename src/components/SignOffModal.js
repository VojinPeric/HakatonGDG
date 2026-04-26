import { React, html } from '../vendor.js';
import { ClipboardCheck, Loader2, X } from 'lucide-react';

const { useEffect, useState } = React;

export default function SignOffModal({ record, insight, onCancel, onSubmit }) {
  const [diagnosis, setDiagnosis] = useState(insight.diagnosis);
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState(insight.severity === 'urgent' ? 'urgent' : 'routine');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, submitting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      recordId: record.id,
      patientName: record.patientName,
      diagnosis,
      notes,
      followUp,
      aiConfidence: insight.confidence,
      submittedAt: new Date().toISOString(),
    };
    await new Promise((r) => setTimeout(r, 550));
    onSubmit(payload);
  };

  return html`
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm animate-fadeIn"
    >
      <form
        onSubmit=${handleSubmit}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/60 animate-slideUp"
      >
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <div
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-cyan-300/80"
            >
              <${ClipboardCheck} className="h-3.5 w-3.5" /> Sign-off
            </div>
            <h3 className="mt-1 text-base font-semibold text-slate-50">
              Finalize report for
              <span className="text-slate-200">${record.patientName}</span>
            </h3>
          </div>
          <button
            type="button"
            onClick=${onCancel}
            disabled=${submitting}
            aria-label="Close"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50"
          >
            <${X} className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5">
          <${Field} label="Diagnosis" hint="Pre-filled from AI proposal — edit as needed.">
            <textarea
              value=${diagnosis}
              onChange=${(e) => setDiagnosis(e.target.value)}
              rows=${2}
              required
              className="w-full resize-none rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
            />
          <//>

          <${Field} label="Cardiologist notes" hint="Free-form clinical context (optional).">
            <textarea
              value=${notes}
              onChange=${(e) => setNotes(e.target.value)}
              rows=${4}
              placeholder="Observations, recommended medications, lifestyle guidance..."
              className="w-full resize-none rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
            />
          <//>

          <${Field} label="Follow-up">
            <div className="grid grid-cols-2 gap-2">
              <${RadioCard}
                checked=${followUp === 'routine'}
                onClick=${() => setFollowUp('routine')}
                label="Routine"
                description="Schedule within standard intervals."
                tone="emerald"
              />
              <${RadioCard}
                checked=${followUp === 'urgent'}
                onClick=${() => setFollowUp('urgent')}
                label="Urgent"
                description="Flag for cardiology consult <48h."
                tone="rose"
              />
            </div>
          <//>
        </div>

        <footer
          className="flex items-center justify-end gap-3 border-t border-slate-800 px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick=${onCancel}
              disabled=${submitting}
              className="rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled=${submitting}
              className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-md shadow-cyan-500/20 transition hover:bg-cyan-400 disabled:cursor-wait disabled:opacity-60"
            >
              ${submitting
                ? html`<${Loader2} className="h-4 w-4 animate-spin" /> Submitting…`
                : html`<${ClipboardCheck} className="h-4 w-4" /> Final submit`}
            </button>
          </div>
        </footer>
      </form>
    </div>
  `;
}

function Field({ label, hint, children }) {
  return html`
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span
          className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400"
          >${label}</span
        >
        ${hint ? html`<span className="text-[11px] text-slate-500">${hint}</span>` : null}
      </div>
      ${children}
    </label>
  `;
}

function RadioCard({ checked, onClick, label, description, tone }) {
  const tones = {
    emerald: checked
      ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100 ring-1 ring-emerald-400/40'
      : 'border-slate-700 hover:border-slate-600 text-slate-300',
    rose: checked
      ? 'border-rose-400/60 bg-rose-500/10 text-rose-100 ring-1 ring-rose-400/40'
      : 'border-slate-700 hover:border-slate-600 text-slate-300',
  };
  return html`
    <button
      type="button"
      onClick=${onClick}
      className=${`flex flex-col items-start gap-1 rounded-md border bg-slate-950/40 px-3 py-2.5 text-left transition ${tones[tone]}`}
    >
      <span className="text-sm font-medium">${label}</span>
      <span className="text-[11px] text-slate-400">${description}</span>
    </button>
  `;
}
