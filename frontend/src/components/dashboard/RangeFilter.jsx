import { CalendarDays, RotateCcw } from 'lucide-react';
import Button from '../ui/Button.jsx';

export default function RangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  onApply,
  onReset,
  loading = false,
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApply?.();
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">From</span>
        <input
          type="date"
          value={from}
          onChange={(event) => onFromChange(event.target.value)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">To</span>
        <input
          type="date"
          value={to}
          onChange={(event) => onToChange(event.target.value)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </label>
      <Button type="submit" size="sm" icon={CalendarDays} loading={loading}>
        Apply
      </Button>
      {onReset ? (
        <Button type="button" size="sm" variant="ghost" icon={RotateCcw} onClick={onReset}>
          Reset
        </Button>
      ) : null}
    </form>
  );
}
