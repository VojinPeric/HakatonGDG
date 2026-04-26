import { html } from '../vendor.js';
import { Check } from 'lucide-react';

export default function SuccessToast({ title = 'Signed off', subtitle }) {
  return html`
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-sm animate-fadeIn"
    >
      <div
        className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-500/30 bg-slate-900 px-10 py-8 text-center shadow-2xl shadow-emerald-500/10 animate-popIn"
      >
        <div
          className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-400/50"
        >
          <${Check} className="h-8 w-8 text-emerald-300" strokeWidth=${3} />
          <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20"></div>
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-50">${title}</div>
          ${subtitle
            ? html`<div className="mt-1 text-sm text-slate-400">${subtitle}</div>`
            : null}
        </div>
      </div>
    </div>
  `;
}
