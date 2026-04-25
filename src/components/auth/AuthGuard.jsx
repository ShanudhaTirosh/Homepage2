/**
 * AuthGuard — Protects dashboard routes.
 * Shows loading spinner while auth resolving, redirects to login if no user.
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
