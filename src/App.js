import { html } from './vendor.js';
import { Activity } from 'lucide-react';
import { useApp } from './context/AppContext.js';
import PendingDashboard from './components/PendingDashboard.js';
import ReviewStation from './components/ReviewStation.js';

export default function App() {
  const { view } = useApp();

  return html`
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <header
        className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-6 py-3 backdrop-blur"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-400/30"
          >
            <${Activity} className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-slate-100">
              Varangian
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              ECG Analysis Station
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-3 text-xs text-slate-400 md:flex">
          <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Dr.</span>
          <span className="font-medium text-slate-200">Vladan Peric</span>
        </div>
      </header>
      <main className="flex-1">
        ${view === 'dashboard' ? html`<${PendingDashboard} />` : html`<${ReviewStation} />`}
      </main>
    </div>
  `;
}
