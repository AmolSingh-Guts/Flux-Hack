import { RefreshCw } from 'lucide-react';
import Button from './Button.jsx';

export default function ErrorState({ title = 'Unable to load this page', message, onRetry }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center">
      <h2 className="text-sm font-semibold text-rose-900">{title}</h2>
      {message ? <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{message}</p> : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-4" icon={RefreshCw} onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
