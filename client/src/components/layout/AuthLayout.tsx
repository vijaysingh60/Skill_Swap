import { ArrowLeftRight, GraduationCap, Handshake, Sparkles } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { Logo } from './Logo';

const points = [
  { icon: GraduationCap, text: 'List what you can teach and what you want to learn.' },
  { icon: Sparkles, text: 'Get matched with students whose skills complement yours.' },
  { icon: Handshake, text: 'Send a request, swap skills, and learn together.' },
];

/** Split screen for login and registration: brand panel on large screens, form always. */
export default function AuthLayout() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[5fr_6fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-700 p-12 text-white lg:flex">
        <div aria-hidden className="absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10" />
        <div aria-hidden className="absolute -right-8 -top-8 h-64 w-64 rounded-full border border-white/10" />
        <Logo onDark />
        <div className="relative">
          <ArrowLeftRight size={28} className="mb-6 text-brand-300" aria-hidden />
          <h2 className="max-w-sm text-3xl font-semibold leading-tight tracking-tight text-white">Trade what you know for what you want to learn.</h2>
          <ul className="mt-8 space-y-4">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-brand-100">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon size={16} aria-hidden />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-brand-200">Made for University of Hyderabad students.</p>
      </aside>

      <div className="flex flex-col">
        <div className="p-4 sm:p-6 lg:hidden">
          <Logo />
        </div>
        <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-4 sm:px-6 lg:py-12">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
