// MIT-BIH 5-category mapping with display info and color tokens.
// Tailwind classes are kept here so components can render consistently.

export const CATEGORIES = [
  {
    type: 'N',
    label: 'Normal',
    description: 'Normal sinus beat',
    hex: '#34d399', // emerald-400
    badgeClass: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    dotClass: 'bg-emerald-400',
  },
  {
    type: 'S',
    label: 'SVEB',
    description: 'Supraventricular ectopic beat',
    hex: '#fbbf24', // amber-400
    badgeClass: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
    dotClass: 'bg-amber-400',
  },
  {
    type: 'V',
    label: 'VEB',
    description: 'Ventricular ectopic beat',
    hex: '#f43f5e', // rose-500
    badgeClass: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
    dotClass: 'bg-rose-500',
  },
  {
    type: 'F',
    label: 'Fusion',
    description: 'Fusion of ventricular and normal',
    hex: '#a78bfa', // violet-400
    badgeClass: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30',
    dotClass: 'bg-violet-400',
  },
  {
    type: 'Q',
    label: 'Unknown',
    description: 'Unknown / paced beat',
    hex: '#94a3b8', // slate-400
    badgeClass: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30',
    dotClass: 'bg-slate-400',
  },
];

export const CATEGORY_BY_TYPE = Object.fromEntries(CATEGORIES.map((c) => [c.type, c]));

export const CATEGORY_TYPES = CATEGORIES.map((c) => c.type);

export const RISK_STYLES = {
  low: {
    label: 'Low risk',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40',
  },
  medium: {
    label: 'Medium risk',
    badgeClass: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40',
  },
  high: {
    label: 'High risk',
    badgeClass: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40',
  },
};

export const SAMPLE_RATE_HZ = 360;
