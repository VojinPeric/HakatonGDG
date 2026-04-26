import { html } from '../vendor.js';
import { Eye, EyeOff } from 'lucide-react';
import { CATEGORIES } from '../constants/categories.js';

export default function CategoryFilters({ visibleTypes, counts, onToggle }) {
  const visibleSet = new Set(visibleTypes);
  return html`
    <div className="flex flex-wrap items-center gap-2">
      <span
        className="mr-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500"
      >
        Show
      </span>
      ${CATEGORIES.map((cat) => {
        const isOn = visibleSet.has(cat.type);
        const count = counts?.[cat.type] ?? 0;
        const btnClass = isOn
          ? `${cat.badgeClass} hover:brightness-110`
          : 'bg-slate-800/50 text-slate-500 ring-1 ring-slate-700/60 hover:text-slate-300';
        return html`
          <button
            key=${cat.type}
            type="button"
            onClick=${() => onToggle(cat.type)}
            title=${cat.description}
            className=${`group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${btnClass}`}
          >
            <span
              className=${`h-2 w-2 rounded-full ${isOn ? cat.dotClass : 'bg-slate-600'}`}
            ></span>
            <span className="font-mono">${cat.type}</span>
            <span className="text-[11px] opacity-80">${cat.label}</span>
            <span
              className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[10px] tabular-nums"
            >
              ${count}
            </span>
            ${isOn
              ? html`<${Eye} className="h-3 w-3 opacity-70" />`
              : html`<${EyeOff} className="h-3 w-3 opacity-70" />`}
          </button>
        `;
      })}
    </div>
  `;
}
