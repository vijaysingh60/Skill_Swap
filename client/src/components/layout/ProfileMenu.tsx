import { BadgeCheck, ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { firstName } from '../../lib/dom';
import { ModeSwitch } from '../ModeSwitch';
import { Avatar } from '../ui/Avatar';
import { overflowNavFor } from './nav';

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Close on outside click or Esc (returning focus to the trigger).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-slate-100 sm:pr-3"
      >
        <Avatar name={user.name} size="sm" />
        <span className="hidden text-sm font-medium text-slate-700 sm:block">{firstName(user.name)}</span>
        <ChevronDown size={16} className="text-slate-500" aria-hidden />
      </button>

      {open && (
        <div id={panelId} className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="my-1 border-t border-slate-100" />
          {user.instructor.status === 'verified' && (
            <div className="px-3 py-2 md:hidden">
              <ModeSwitch className="flex w-full [&>button]:flex-1 [&>button]:justify-center" onSwitched={() => setOpen(false)} />
            </div>
          )}
          {/* Pages that don't fit the mobile bottom bar */}
          <div className="lg:hidden">
            {overflowNavFor(user).map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                <Icon size={16} aria-hidden /> {label}
              </Link>
            ))}
          </div>
          {user.instructor.status !== 'verified' && (
            <Link to="/instructor" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              <BadgeCheck size={16} aria-hidden /> {user.instructor.status === 'none' ? 'Become an instructor' : 'Instructor application'}
            </Link>
          )}
          <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            <UserRound size={16} aria-hidden /> My profile
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
          >
            <LogOut size={16} aria-hidden /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
