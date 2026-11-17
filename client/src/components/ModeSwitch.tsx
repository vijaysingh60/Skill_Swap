import { GraduationCap, Presentation } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';
import type { Mode } from '../types';
import { useToast } from './ui/Toast';

const OPTIONS: { mode: Mode; label: string; icon: typeof GraduationCap }[] = [
  { mode: 'student', label: 'Student', icon: GraduationCap },
  { mode: 'instructor', label: 'Instructor', icon: Presentation },
];

/** Lets a verified instructor flip between teaching and learning. Renders nothing for anyone else. */
// `className` controls display (e.g. "hidden md:inline-flex"), so no display class is baked in: cn() does not
// resolve conflicts the way tailwind-merge would, and two display classes would fight.
export function ModeSwitch({ className = 'inline-flex', onSwitched }: { className?: string; onSwitched?: () => void }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [pending, setPending] = useState<Mode | null>(null);

  if (!user || user.instructor.status !== 'verified') return null;

  const choose = async (mode: Mode) => {
    if (mode === user.mode || pending) return;
    setPending(mode);
    try {
      const { user: updated } = await api.setMode(mode);
      setUser(updated);
      toast.success(mode === 'instructor' ? 'Switched to instructor mode.' : 'Switched to student mode.');
      onSwitched?.();
      // Land somewhere that makes sense in the new mode.
      if (mode === 'instructor') navigate('/teaching');
      else if (pathname.startsWith('/teaching')) navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not switch mode.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div role="group" aria-label="View mode" className={cn('rounded-lg bg-slate-100 p-0.5', className)}>
      {OPTIONS.map(({ mode, label, icon: Icon }) => {
        const active = user.mode === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={active}
            disabled={pending !== null}
            onClick={() => choose(mode)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-wait',
              active ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            <Icon size={14} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
