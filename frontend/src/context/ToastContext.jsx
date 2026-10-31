import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let sequence = 0;

const toneStyles = {
  success: {
    icon: CheckCircle2,
    container: 'border-emerald-200 bg-white',
    iconClass: 'text-emerald-600',
    bar: 'bg-emerald-500',
  },
  error: {
    icon: AlertCircle,
    container: 'border-rose-200 bg-white',
    iconClass: 'text-rose-600',
    bar: 'bg-rose-500',
  },
  info: {
    icon: Info,
    container: 'border-brand-200 bg-white',
    iconClass: 'text-brand-600',
    bar: 'bg-brand-500',
  },
};

function Toast({ toast, onDismiss }) {
  const tone = toneStyles[toast.tone] ?? toneStyles.info;
  const Icon = tone.icon;

  return (
    <div
      className={`pointer-events-auto relative w-full overflow-hidden rounded-xl border shadow-lg shadow-slate-900/10 ${tone.container}`}
      role="status"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} aria-hidden="true" />
      <div className="flex items-start gap-3 py-3 pl-4 pr-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.iconClass}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {toast.title ? (
            <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
          ) : null}
          <p className="text-sm leading-5 text-slate-600">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);

    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (tone, message, options = {}) => {
      const id = ++sequence;
      const duration = options.duration ?? 4500;

      setToasts((current) => [
        ...current.slice(-3),
        { id, tone, message, title: options.title },
      ]);

      if (duration > 0) {
        timers.current.set(
          id,
          window.setTimeout(() => dismiss(id), duration),
        );
      }

      return id;
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) {
        window.clearTimeout(timer);
      }
      timers.current.clear();
    },
    [],
  );

  const value = useMemo(
    () => ({
      success: (message, options) => push('success', message, options),
      error: (message, options) => push('error', message, options),
      info: (message, options) => push('info', message, options),
      dismiss,
    }),
    [dismiss, push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="w-full max-w-sm">
            <Toast toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider.');
  }

  return context;
}
