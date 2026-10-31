import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/ui/Spinner.jsx';

export function FullPageLoader({ label = 'Restoring your session…' }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <Spinner label={label} />
    </div>
  );
}

export default function ProtectedRoute({ roles }) {
  const { user, loading, homePath } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePath} replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading, homePath } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (user) {
    return <Navigate to={homePath} replace />;
  }

  return <Outlet />;
}
