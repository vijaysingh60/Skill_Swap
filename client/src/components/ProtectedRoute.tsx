import { LoaderCircle } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center gap-2 text-sm text-slate-600">
        <LoaderCircle className="animate-spin" size={20} aria-hidden />
        Checking your session…
      </div>
    );
  }
  // No redirect state is attached here on purpose: it would stick to this
  // browser history entry, not to the person who gets redirected. See Login.tsx.
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
