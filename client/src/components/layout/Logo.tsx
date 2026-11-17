import { ArrowLeftRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

interface Props {
  to?: string;
  /** Mark only, without the wordmark. */
  compact?: boolean;
  onDark?: boolean;
  className?: string;
}

export function Logo({ to = '/', compact, onDark, className }: Props) {
  return (
    <Link to={to} aria-label="Skill Swap home" className={cn('flex items-center gap-2.5 rounded-lg font-semibold tracking-tight', onDark ? 'text-white' : 'text-slate-900', className)}>
      <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', onDark ? 'bg-white text-brand-700' : 'bg-brand-600 text-white')}>
        <ArrowLeftRight size={17} aria-hidden />
      </span>
      {!compact && <span className="text-base">Skill Swap</span>}
    </Link>
  );
}
