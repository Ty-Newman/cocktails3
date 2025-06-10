import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return null; // Or a loading spinner
  }

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
} 