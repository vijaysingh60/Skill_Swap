import { Sparkles } from 'lucide-react';
import { cn } from '../lib/cn';
import type { Match } from '../types';

const list = (names: string[]) => names.join(', ');

/** One-line explanation of why a student is a good match for the current user. */
export function MatchNote({ match }: { match?: Match }) {
  if (!match || match.theyCanTeachMe.length === 0) return null;
  return (
    <p className={cn('flex items-start gap-2 rounded-lg px-3 py-2 text-xs', match.mutual ? 'bg-brand-50 text-brand-900' : 'bg-slate-50 text-slate-700')}>
      <Sparkles size={14} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
      <span>
        {match.mutual && <strong className="font-semibold">Mutual match. </strong>}
        Teaches <strong className="font-semibold">{list(match.theyCanTeachMe)}</strong>
        {match.mutual ? (
          <>
            , and wants <strong className="font-semibold">{list(match.iCanTeachThem)}</strong> from you.
          </>
        ) : (
          <> you want to learn.</>
        )}
      </span>
    </p>
  );
}
