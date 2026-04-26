import { html } from '../vendor.js';
import { RISK_STYLES } from '../constants/categories.js';

export default function RiskBadge({ level }) {
  const style = RISK_STYLES[level] ?? RISK_STYLES.low;
  const dotColor =
    level === 'high' ? 'bg-rose-400' : level === 'medium' ? 'bg-amber-400' : 'bg-emerald-400';
  return html`
    <span
      className=${`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.badgeClass}`}
    >
      <span className=${`h-1.5 w-1.5 rounded-full ${dotColor}`}></span>
      ${style.label}
    </span>
  `;
}
