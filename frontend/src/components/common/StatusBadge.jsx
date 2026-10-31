const styles = {
  up: {
    label: 'Operational',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    dotClass: 'bg-emerald-500',
  },
  down: {
    label: 'Unavailable',
    badgeClass: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    dotClass: 'bg-rose-500',
  },
  checking: {
    label: 'Checking',
    badgeClass: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    dotClass: 'bg-amber-500 animate-pulse',
  },
  unknown: {
    label: 'Unknown',
    badgeClass: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    dotClass: 'bg-slate-400',
  },
};

export default function StatusBadge({ status = 'unknown', label }) {
  const config = styles[status] ?? styles.unknown;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${config.badgeClass}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`}
        aria-hidden="true"
      />
      {label ?? config.label}
    </span>
  );
}
