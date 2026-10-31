import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { FullPageLoader } from './ProtectedRoute.jsx';

export default function HomeRedirect() {
  const { user, loading, homePath } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  return <Navigate to={user ? homePath : '/login'} replace />;
}
