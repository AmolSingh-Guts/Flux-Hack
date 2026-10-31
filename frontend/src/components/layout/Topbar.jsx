import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, UserCircle } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { navigationFor } from '../../config/navigation.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { titleCase } from '../../utils/format.js';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const title = useMemo(() => {
    const items = navigationFor(user).flatMap((section) => section.items);
    const match = [...items]
      .sort((a, b) => b.to.length - a.to.length)
      .find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));

    return match?.label ?? 'Brightloop';
  }, [location.pathname, user]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const onClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const profilePath = user?.role === 'CUSTOMER' ? '/portal/profile' : `/${user?.role === 'ADMIN' ? 'admin' : 'staff'}/profile`;

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="hidden text-xs text-slate-500 sm:block">
              {user?.role === 'CUSTOMER'
                ? user?.companyName || user?.customerName || 'Customer portal'
                : user?.companyName || 'Brightloop Software'}
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-2" ref={menuRef}>
          <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 sm:inline-flex">
            {titleCase(user?.role)}
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="flex items-center gap-2 rounded-full border border-transparent p-1 pr-2 transition hover:border-slate-200 hover:bg-slate-50"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Avatar name={user?.name} size="sm" />
            <span className="hidden max-w-[10rem] truncate text-sm font-medium text-slate-700 sm:block">
              {user?.name}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </button>

          {menuOpen ? (
            <div
              className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
              role="menu"
            >
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <Link
                to={profilePath}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                role="menuitem"
              >
                <UserCircle className="h-4 w-4 text-slate-400" aria-hidden="true" />
                My profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
