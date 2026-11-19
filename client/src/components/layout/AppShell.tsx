import { Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/cn';
import { ModeSwitch } from '../ModeSwitch';
import { Avatar } from '../ui/Avatar';
import { Input } from '../ui/Field';
import { Logo } from './Logo';
import { isActive, mobileNavFor, navFor, titleFor } from './nav';
import { ProfileMenu } from './ProfileMenu';

function Sidebar() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center px-6">
        <Logo to="/dashboard" />
      </div>
      <nav aria-label="Main" className="flex-1 space-y-0.5 px-3 py-2">
        {(user ? navFor(user) : []).map((item) => {
          const active = isActive(item, pathname);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors',
                active ? 'border-brand-600 bg-slate-50 text-slate-900' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <item.icon size={18} className={active ? 'text-brand-600' : 'text-slate-400'} aria-hidden />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      {user && (
        <Link to="/profile" className="m-3 flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50">
          <Avatar name={user.name} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-slate-900">{user.name}</span>
            <span className="block truncate text-xs text-slate-500">{user.department}</span>
          </span>
        </Link>
      )}
    </aside>
  );
}

function BottomNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      {(user ? mobileNavFor(user) : []).map((item) => {
        const active = isActive(item, pathname);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn('flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors', active ? 'text-brand-700' : 'text-slate-500 hover:text-slate-900')}
          >
            <item.icon size={20} aria-hidden />
            {item.short}
          </NavLink>
        );
      })}
    </nav>
  );
}

function TopBar({ title, showSearch }: { title: string; showSearch: boolean }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/discover?q=${encodeURIComponent(q)}` : '/discover');
    setQuery('');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur lg:px-8">
      <Logo to="/dashboard" compact className="lg:hidden" />
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="flex-1" />
      <ModeSwitch className="hidden md:inline-flex" />
      {showSearch && (
        <form role="search" onSubmit={submit} className="relative hidden w-64 md:block lg:w-80">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
          <Input type="search" className="pl-9" placeholder="Search students or skills" aria-label="Search students or skills" maxLength={50} value={query} onChange={(e) => setQuery(e.target.value)} />
        </form>
      )}
      <ProfileMenu />
    </header>
  );
}

/** Sidebar + top bar on desktop, top bar + bottom tab bar on mobile. */
export default function AppShell() {
  const { pathname, hash } = useLocation();

  // Start each page at the top, unless the link points at a section (e.g. #request).
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only z-[70] rounded-lg bg-white px-4 py-2 text-sm font-medium text-brand-700 shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={titleFor(pathname)} showSearch={!pathname.startsWith('/discover')} />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
