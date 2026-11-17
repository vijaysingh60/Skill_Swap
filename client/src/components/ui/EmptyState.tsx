import { CircleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  /** The next step, e.g. a link or button. */
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center gap-2 border-dashed px-6 py-10 text-center">
      <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icon size={22} aria-hidden />
      </span>
      <h3 className="text-base">{title}</h3>
      {children && <div className="max-w-sm text-sm text-slate-600">{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-2 border-rose-200 px-6 py-10 text-center">
      <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <CircleAlert size={22} aria-hidden />
      </span>
      <h3 className="text-base">Something went wrong</h3>
      <p className="max-w-sm text-sm text-slate-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3">
          Try again
        </Button>
      )}
    </div>
  );
}
