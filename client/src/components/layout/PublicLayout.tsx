import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { buttonStyles, LinkButton } from '../ui/Button';
import { Logo } from './Logo';

const sections = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#explore', label: 'Skills' },
  { href: '/#community', label: 'Community' },
];

function Header() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {sections.map((s) => (
            <a key={s.href} href={s.href} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              {s.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <LinkButton to="/dashboard" size="sm">
              Go to dashboard
            </LinkButton>
          ) : (
            <>
              <Link to="/login" className={buttonStyles('ghost', 'sm')}>
                Log in
              </Link>
              <LinkButton to="/register" size="sm">
                Get started
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { user } = useAuth();
  const links = user
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/discover', label: 'Discover' },
        { to: '/requests', label: 'My Requests' },
      ]
    : [
        { to: '/login', label: 'Log in' },
        { to: '/register', label: 'Create an account' },
      ];
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-slate-600">A skill exchange for University of Hyderabad students. Teach what you know, learn what you don’t.</p>
        </div>
        <div>
          <h2 className="text-sm">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {sections.map((s) => (
              <li key={s.href}>
                <a href={s.href} className="hover:text-brand-700">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm">{user ? 'Your account' : 'Get started'}</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-brand-700">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} Skill Swap. Made for students, by students.</div>
    </footer>
  );
}

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
