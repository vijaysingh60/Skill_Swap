import { ShieldAlert } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { useCurrentUser } from '../context/AuthContext';
import { LinkButton } from './ui/Button';
import { EmptyState } from './ui/EmptyState';

/** Route guard for admin-only pages. The server enforces this too; this just avoids a dead-end screen. */
export default function RequireAdmin() {
  const user = useCurrentUser();
  if (user.role === 'admin') return <Outlet />;
  return (
    <div className="mx-auto max-w-2xl pt-6">
      <EmptyState icon={ShieldAlert} title="Admins only" action={<LinkButton to="/dashboard" variant="secondary">Back to dashboard</LinkButton>}>
        You don’t have permission to view this page.
      </EmptyState>
    </div>
  );
}
