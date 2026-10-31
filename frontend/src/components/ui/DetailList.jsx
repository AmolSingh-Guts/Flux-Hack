export default function DetailList({ items, columns = 2, className = '' }) {
  return (
    <dl className={`grid gap-x-6 gap-y-4 ${columns === 1 ? 'grid-cols-1' : columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'} ${className}`}>
      {items.filter(Boolean).map((item) => (
        <div key={item.label} className={item.full ? 'sm:col-span-2' : ''}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</dt>
          <dd className="mt-1 text-sm text-slate-900">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
