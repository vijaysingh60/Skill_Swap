import { ArrowLeftRight, BookOpen, Check, CircleCheck, Code, Coffee, GraduationCap, Handshake, Languages, Music, Palette, Search, UserRound, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SkillBadge } from '../components/SkillBadge';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { buttonStyles, LinkButton } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/cn';
import type { Skill } from '../types';

function SectionHeading({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <h2 id={id} className="text-2xl sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 text-base text-slate-600">{subtitle}</p>
    </div>
  );
}

/* ---------- Hero ---------- */

function MiniProfile({ name, department, teaches, wants }: { name: string; department: string; teaches: Skill; wants: Skill }) {
  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center gap-3">
        <Avatar name={name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
          <p className="truncate text-xs text-slate-500">{department}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Can teach</p>
        <SkillBadge skill={teaches} tone="offered" />
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Wants to learn</p>
        <SkillBadge skill={wants} tone="wanted" />
      </div>
    </div>
  );
}

/** An illustration of the core idea. The people shown are examples, not real accounts. */
function HeroComposition() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-lg">
      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <MiniProfile name="Meera I." department="Psychology" teaches={{ name: 'Guitar', level: 'advanced' }} wants={{ name: 'Python', level: 'beginner' }} />
        <div className="flex items-center justify-center gap-1 text-brand-600 sm:flex-col">
          <span className="h-px w-6 border-t border-dashed border-brand-300 sm:h-6 sm:w-px sm:border-l sm:border-t-0" />
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-200 bg-white shadow-xs">
            <ArrowLeftRight size={18} className="rotate-90 sm:rotate-0" />
          </span>
          <span className="h-px w-6 border-t border-dashed border-brand-300 sm:h-6 sm:w-px sm:border-l sm:border-t-0" />
        </div>
        <MiniProfile name="Aarav S." department="Computer Science" teaches={{ name: 'Python', level: 'advanced' }} wants={{ name: 'Guitar', level: 'beginner' }} />
      </div>

      <div className="card mt-4 flex items-center gap-3 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CircleCheck size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">Swap accepted</p>
          <p className="text-xs text-slate-500">Guitar for Python. Say hello and plan your first session.</p>
        </div>
        <Badge tone="success">Accepted</Badge>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">Illustrative example</p>
    </div>
  );
}

function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-brand-50 to-transparent" />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
        <div>
          <Badge tone="brand" icon={GraduationCap}>
            For University of Hyderabad students
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-[3.5rem]">
            Learn Together. <span className="text-brand-600">Grow Together.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600">
            Connect with students who share their knowledge, learn new skills through personalized sessions, and turn your curiosity into capability.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton to={signedIn ? '/dashboard' : '/register'} size="lg">
              {signedIn ? 'Go to dashboard' : 'Start Learning'}
            </LinkButton>
            <a href="#explore" className={buttonStyles('secondary', 'lg')}>
              Explore Skills
            </a>
          </div>
          <p className="mt-5 text-sm text-slate-500">Your email stays private until you and another student agree to swap.</p>
        </div>
        <HeroComposition />
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */

const steps: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: UserRound, title: 'Build your profile', text: 'List the skills you can teach and the ones you want to learn, with your level in each.' },
  { icon: Search, title: 'Find your match', text: 'Browse or search students. People you can teach each other are ranked first.' },
  { icon: Handshake, title: 'Swap skills', text: 'Request a session, offering a skill in return. Once they accept, get in touch and start learning.' },
];

function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeading id="how-heading" title="How it works" subtitle="Three simple steps from curious to capable." />
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="card relative p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon size={22} aria-hidden />
            </span>
            <span className="absolute right-5 top-5 text-sm font-semibold text-slate-300" aria-hidden>
              0{i + 1}
            </span>
            <h3 className="mt-4 text-base">{title}</h3>
            <p className="mt-1.5 text-sm text-slate-600">{text}</p>
          </li>
        ))}
      </ol>
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
        <SectionHeading id="explore-heading" title="Explore skills students swap" subtitle="Students can list any skill they like. Here are some ideas to search for." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(({ icon: Icon, title, skills }) => (
            <div key={title} className="card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
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
  const reasons = ['Meet students from other departments and learn something outside your field.', 'Matches are ranked by what you can teach each other, not by popularity.', 'Teaching a skill is one of the best ways to master it.'];
  return (
    <section id="community" aria-labelledby="community-heading" className="mx-auto grid max-w-6xl scroll-mt-16 grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
      <div>
        <h2 id="community-heading" className="text-2xl sm:text-3xl">
          Discover your learning community
        </h2>
        <p className="mt-3 text-base text-slate-600">Every student shares what they can teach and what they want to learn, so finding the right person takes minutes, not weeks.</p>
        <ul className="mt-6 space-y-3">
          {reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Check size={12} strokeWidth={3} aria-hidden />
              </span>
              {reason}
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-6">
        <h3 className="text-base">How we rank your matches</h3>
        <ol className="mt-4 space-y-3">
          {matchTiers.map(({ title, text, badge }, i) => (
            <li key={title} className={cn('flex items-start gap-3 rounded-lg border p-3', i === 0 ? 'border-brand-200 bg-brand-50/60' : 'border-slate-200')}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-700 shadow-xs ring-1 ring-slate-200">{i + 1}</span>
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
      <div className="rounded-2xl bg-brand-700 px-6 py-12 text-center sm:px-12">
        <h2 id="cta-heading" className="text-2xl !text-white sm:text-3xl">
          Ready to swap skills?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-brand-100">Create your profile in a minute and see who on campus can teach you something new.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <LinkButton to={signedIn ? '/discover' : '/register'} variant="secondary" size="lg">
            {signedIn ? 'Discover students' : 'Start Learning'}
          </LinkButton>
          {!signedIn && (
            <Link to="/login" className={cn(buttonStyles('ghost', 'lg'), 'border border-white/30 text-white hover:bg-white/10 hover:text-white')}>
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
