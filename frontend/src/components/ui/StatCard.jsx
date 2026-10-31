const tones = {
  brand: { icon: 'bg-brand-50 text-brand-600', value: 'text-slate-900' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-slate-900' },
  amber: { icon: 'bg-amber-50 text-amber-600', value: 'text-slate-900' },
  rose: { icon: 'bg-rose-50 text-rose-600', value: 'text-slate-900' },
  violet: { icon: 'bg-violet-50 text-violet-600', value: 'text-slate-900' },
  slate: { icon: 'bg-slate-100 text-slate-600', value: 'text-slate-900' },
};

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
  loading = false,
  className = '',
}) {
  const style = tones[tone] ?? tones.brand;

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {Icon ? (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${style.icon}`} aria-hidden="true">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded-md bg-slate-100" />
      ) : (
        <p className={`mt-2 text-2xl font-semibold tracking-tight ${style.value}`}>{value}</p>
      )}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
