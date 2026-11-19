import { Check, Code, Coffee, Languages, Music, Palette, Search, UserRound, BookOpen, Video, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { buttonStyles, LinkButton } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/cn';

/* ---------- Hero ---------- */

function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">University of Hyderabad</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.375rem]">
          Learn together. Grow together.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
          Connect with students who share their knowledge, learn new skills through personalized sessions, and turn your curiosity into capability.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton to={signedIn ? '/dashboard' : '/register'} size="lg">
            {signedIn ? 'Go to dashboard' : 'Start learning'}
          </LinkButton>
          <a href="#explore" className={buttonStyles('secondary', 'lg')}>
            Explore skills
          </a>
        </div>
        <p className="mt-6 text-sm text-slate-500">Free for every verified University of Hyderabad student.</p>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */

const steps: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: UserRound, title: 'Build your profile', text: 'List the skills you can teach and the ones you want to learn, with your level in each.' },
  { icon: Search, title: 'Find your match', text: 'Browse or search students. People you can teach each other are ranked first.' },
  { icon: Video, title: 'Join a live class', text: 'Book a seat in a class hosted by a verified student instructor, or apply to host one yourself.' },
];

function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_2fr]">
        <h2 id="how-heading" className="text-2xl sm:text-3xl">
          How it works
        </h2>
        <ol className="divide-y divide-slate-200 border-t border-slate-200">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="flex gap-5 py-6 first:pt-0 last:pb-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 font-mono text-sm text-slate-400">0{i + 1}</span>
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-base">
                  <Icon size={16} className="text-brand-600" aria-hidden />
                  {title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- Explore skills ---------- */

// Examples of what students trade. Each chip opens a Discover search (after login).
const categories: { icon: LucideIcon; title: string; skills: string[] }[] = [
  { icon: Code, title: 'Programming', skills: ['Python', 'React', 'Java', 'SQL'] },
  { icon: Languages, title: 'Languages', skills: ['Telugu', 'Hindi', 'Urdu', 'Tamil'] },
  { icon: Music, title: 'Music & dance', skills: ['Guitar', 'Carnatic Vocals', 'Kathak', 'Harmonium'] },
  { icon: Palette, title: 'Design & media', skills: ['UI Design', 'Photography', 'Video Editing', 'Figma'] },
  { icon: BookOpen, title: 'Academics', skills: ['Statistics', 'LaTeX', 'Academic Writing', 'Research Methods'] },
  { icon: Coffee, title: 'Everyday skills', skills: ['Cooking', 'Chess', 'Yoga', 'Public Speaking'] },
];

function ExploreSkills() {
  return (
    <section id="explore" aria-labelledby="explore-heading" className="scroll-mt-16 border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-xl">
          <h2 id="explore-heading" className="text-2xl sm:text-3xl">
            Explore skills students teach
          </h2>
          <p className="mt-3 text-base text-slate-600">Students can list any skill they like. Here are some ideas to search for.</p>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(({ icon: Icon, title, skills }) => (
            <div key={title} className="bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="icon-tile">
                  <Icon size={18} aria-hidden />
                </span>
                <h3 className="text-base">{title}</h3>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <li key={skill}>
                    <Link
                      to={`/discover?q=${encodeURIComponent(skill)}`}
                      className="inline-block rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                    >
                      {skill}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Community ---------- */

const matchTiers: { title: string; text: string; badge?: ReactNode }[] = [
  { title: 'Mutual match', text: 'You can teach each other. These come first.', badge: <Badge tone="brand">Best</Badge> },
  { title: 'They teach what you want', text: 'Someone who can help you learn, even if you can’t teach them yet.' },
  { title: 'Everyone else', text: 'Browse the whole community on Discover and search by name or skill.' },
];

function Community() {
  const reasons = [
    'Meet students from other departments and learn something outside your field.',
    'Matches are ranked by what you can teach each other, not by popularity.',
    'Teaching a skill is one of the best ways to master it.',
  ];
  return (
    <section id="community" aria-labelledby="community-heading" className="mx-auto grid max-w-6xl scroll-mt-16 grid-cols-1 items-start gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
      <div>
        <h2 id="community-heading" className="text-2xl sm:text-3xl">
          Discover your learning community
        </h2>
        <p className="mt-3 text-base text-slate-600">
          Every student shares what they can teach and what they want to learn, so finding the right person takes minutes, not weeks.
        </p>
        <ul className="mt-6 space-y-3 border-t border-slate-200 pt-5">
          {reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-3 text-sm text-slate-700">
              <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
              {reason}
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-6">
        <h3 className="text-base">How we rank your matches</h3>
        <ol className="mt-4 divide-y divide-slate-100">
          {matchTiers.map(({ title, text, badge }, i) => (
            <li key={title} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="font-mono text-xs text-slate-400">0{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  {title} {badge}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- Final call to action ---------- */

function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section aria-labelledby="cta-heading" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
      <div className="flex flex-col items-start gap-6 rounded-xl bg-slate-900 px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div>
          <h2 id="cta-heading" className="text-2xl !text-white">
            Ready to start learning?
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">Create your profile in a minute and see who on campus can teach you something new.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <LinkButton to={signedIn ? '/discover' : '/register'} size="lg">
            {signedIn ? 'Discover students' : 'Start learning'}
          </LinkButton>
          {!signedIn && (
            <Link to="/login" className={cn(buttonStyles('ghost', 'lg'), 'border border-white/15 text-white hover:bg-white/10 hover:text-white')}>
              Log in
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  usePageTitle('Skill Swap');
  const { user } = useAuth();
  const signedIn = !!user;
  return (
    <>
      <Hero signedIn={signedIn} />
      <HowItWorks />
      <ExploreSkills />
      <Community />
      <FinalCta signedIn={signedIn} />
    </>
  );
}
