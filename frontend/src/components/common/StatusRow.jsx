import StatusBadge from './StatusBadge.jsx';

export default function StatusRow({ name, description, status, label }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{name}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{description}</p>
      </div>
      <StatusBadge status={status} label={label} />
    </div>
  );
}
