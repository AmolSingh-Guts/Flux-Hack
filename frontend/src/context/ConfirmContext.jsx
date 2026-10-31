import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button.jsx';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setDialog({
        title: options?.title ?? 'Are you sure?',
        message: options?.message ?? 'This action cannot be undone.',
        confirmLabel: options?.confirmLabel ?? 'Confirm',
        cancelLabel: options?.cancelLabel ?? 'Cancel',
        tone: options?.tone ?? 'danger',
      });
    });
  }, []);

  const settle = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);
  const danger = dialog?.tone !== 'primary';

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => settle(false)}
            aria-hidden="true"
          />
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <div className="flex items-start gap-4">
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                  danger ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600'
                }`}
                aria-hidden="true"
              >
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h2 id="confirm-title" className="text-base font-semibold text-slate-900">
                  {dialog.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{dialog.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => settle(false)}>
                {dialog.cancelLabel}
              </Button>
              <Button
                variant={danger ? 'danger' : 'primary'}
                onClick={() => settle(true)}
                autoFocus
              >
                {dialog.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error('useConfirm must be used inside a ConfirmProvider.');
  }

  return context.confirm;
}
