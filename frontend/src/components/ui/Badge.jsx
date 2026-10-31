import { STATUS_STYLES } from '../../utils/constants.js';
import { titleCase } from '../../utils/format.js';

const tones = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20',
};

const dots = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  slate: 'bg-slate-400',
  brand: 'bg-brand-500',
};

export default function Badge({ children, status, tone, dot = true, className = '' }) {
  const resolvedTone = tone ?? STATUS_STYLES[status] ?? 'slate';
  const label = children ?? (status ? titleCase(status) : '');

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        tones[resolvedTone] ?? tones.slate
      } ${className}`}
    >
      {dot ? (
        <span className={`h-1.5 w-1.5 rounded-full ${dots[resolvedTone] ?? dots.slate}`} aria-hidden="true" />
      ) : null}
      {label}
    </span>
  );
}
