import { Outlet } from 'react-router-dom';
import { Logo } from './Logo';

const steps = [
  ['List', 'What you can teach, and what you want to learn.'],
  ['Match', "We surface students who teach what you're after."],
  ['Learn', 'Book a live class from a verified student instructor and start learning.'],
] as const;

/** Split screen for login and registration: a quiet editorial panel, form always visible. */
export default function AuthLayout() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[5fr_6fr]">
      <aside className="hidden flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
        <Logo onDark />

        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">University of Hyderabad</p>
          <h2 className="mt-4 max-w-sm text-[2.25rem] font-semibold leading-[1.15] tracking-tight text-white">
            Learn from fellow students who know what you want to know.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">
            No fees, no subscriptions — just students teaching students, one skill at a time.
          </p>
        </div>

        <ol className="space-y-5 border-t border-white/10 pt-6">
          {steps.map(([title, text], i) => (
            <li key={title} className="flex gap-4">
              <span className="font-mono text-xs text-slate-500">0{i + 1}</span>
              <div>
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="mt-0.5 text-sm text-slate-400">{text}</p>
              </div>
            </li>
          ))}
        </ol>
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
