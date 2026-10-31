import { Inbox } from 'lucide-react';
import Button from './Button.jsx';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  actionLabel,
  onAction,
  action,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400" aria-hidden="true">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ??
        (actionLabel && onAction ? (
          <Button className="mt-5" onClick={onAction} size="sm">
            {actionLabel}
          </Button>
        ) : null)}
    </div>
  );
}
