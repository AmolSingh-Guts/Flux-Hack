import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const tones = {
  error: {
    container: 'border-rose-200 bg-rose-50 text-rose-800',
    icon: AlertCircle,
    iconClass: 'text-rose-500',
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
  },
  info: {
    container: 'border-brand-200 bg-brand-50 text-brand-800',
    icon: Info,
    iconClass: 'text-brand-500',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: AlertCircle,
    iconClass: 'text-amber-500',
  },
};

export default function Alert({ tone = 'info', title, children, className = '' }) {
  const style = tones[tone] ?? tones.info;
  const Icon = style.icon;

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${style.container} ${className}`} role="alert">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconClass}`} aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? 'mt-0.5 leading-6' : 'leading-6'}>{children}</div> : null}
      </div>
    </div>
  );
}
