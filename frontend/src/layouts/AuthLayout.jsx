import { Outlet } from 'react-router-dom';
import Logo from '../components/layout/Logo.jsx';

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-slate-950 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,123,235,0.35),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(59,153,246,0.25),transparent_40%)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo to={null} theme="light" />
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
              Subscription operations
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white">
              Run every subscription from one calm, reliable workspace.
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Brightloop brings customers, quotations, recurring billing, invoices,
              payments, and reporting together so your team can focus on growth.
            </p>
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-400">Billing</dt>
                <dd className="mt-1 text-sm font-medium text-white">Automated</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-400">Access</dt>
                <dd className="mt-1 text-sm font-medium text-white">Role based</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-400">Records</dt>
                <dd className="mt-1 text-sm font-medium text-white">Auditable</dd>
              </div>
            </dl>
          </div>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Brightloop Software. All rights reserved.
          </p>
        </div>
      </div>

      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-6 py-5 lg:justify-end">
          <Logo to="/" className="lg:hidden" />
          <p className="text-xs text-slate-500">Secure account access</p>
        </div>
        <main className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
