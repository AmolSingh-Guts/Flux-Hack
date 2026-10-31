import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import Logo from './Logo.jsx';
import Avatar from '../ui/Avatar.jsx';
import { navigationFor } from '../../config/navigation.js';
import { titleCase } from '../../utils/format.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const sections = navigationFor(user);

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Logo to={user?.role === 'CUSTOMER' ? '/portal/dashboard' : `/${user?.role === 'ADMIN' ? 'admin' : 'staff'}/dashboard`} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5" aria-label="Main navigation">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            isActive
                              ? 'bg-brand-50 text-brand-700'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={`h-4 w-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`}
                              aria-hidden="true"
                            />
                            {item.label}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
            <Avatar name={user?.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">{titleCase(user?.role)}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
