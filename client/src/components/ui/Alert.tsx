import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

const styles = {
  error: { box: 'border-rose-200 bg-rose-50 text-rose-800', icon: CircleAlert },
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon: CircleCheck },
  info: { box: 'border-brand-200 bg-brand-50 text-brand-800', icon: Info },
};

/** Inline message for the page or form it relates to. */
export function Alert({ variant, children }: { variant: keyof typeof styles; children: ReactNode }) {
  const { box, icon: Icon } = styles[variant];
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm', box)}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
