import { ArrowLeftRight, BadgeCheck, CalendarX, Clock, GraduationCap, Handshake, Inbox, Pencil, Presentation, Search, Sparkles, Users, Video, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { RequestCard } from '../components/RequestCard';
import { SkillList } from '../components/SkillList';
import { StudentCard } from '../components/StudentCard';
import { InstructorBadge } from '../components/InstructorBadge';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { LinkButton } from '../components/ui/Button';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingGrid, LoadingList, Skeleton } from '../components/ui/Skeleton';
import { useCurrentUser } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { useNow } from '../hooks/useNow';
import { usePageTitle } from '../hooks/usePageTitle';
import { firstName } from '../lib/dom';
import { formatTime, phaseAt, timeUntil } from '../lib/time';
import type { ClassSession, CurrentUser, ExchangeRequest } from '../types';

function StatCard({ icon: Icon, label, value, to }: { icon: LucideIcon; label: string; value?: number; to: string }) {
  return (
    <Link to={to} className="card flex flex-col items-start gap-3 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40 sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon size={20} aria-hidden />
      </span>
      <span className="min-w-0">
        {value === undefined ? <Skeleton className="mb-1 h-6 w-8" /> : <span className="block text-2xl font-semibold leading-tight text-slate-900">{value}</span>}
        <span className="block text-xs text-slate-600">{label}</span>
      </span>
    </Link>
  );
}

/** One upcoming class: a date tile, the essentials, and a join button once the room opens. */
function ClassRow({ session, now }: { session: ClassSession; now: number }) {
  const phase = phaseAt(session, now);
  const start = new Date(session.startsAt);
  return (
    <li className="flex items-center gap-4 p-4">
      <div aria-hidden className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <span className="text-[10px] font-semibold uppercase leading-none">{start.toLocaleString(undefined, { month: 'short' })}</span>
        <span className="text-lg font-semibold leading-tight">{start.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{session.title}</p>
        <p className="truncate text-xs text-slate-600">
          {formatTime(session.startsAt)} · {session.isHost ? 'You’re hosting' : `with ${session.instructor.name}`} · {session.skill}
        </p>
      </div>
      {phase === 'open' ? (
        <LinkButton to={`/classes/${session.id}/room`} size="sm" icon={Video}>
          {session.isHost ? 'Start' : 'Join'}
        </LinkButton>
      ) : (
        <Badge>{timeUntil(session.startsAt, now)}</Badge>
      )}
    </li>
  );
}

/** Where the user stands on becoming an instructor, with the next step. */
function InstructorCard({ user }: { user: CurrentUser }) {
  const { status } = user.instructor;
  return (
    <section className="card p-5" aria-labelledby="instructor-heading">
      <h2 id="instructor-heading" className="mb-2 flex items-center gap-2 text-base">
        <Presentation size={18} className="text-brand-600" aria-hidden /> Teaching
      </h2>
      {status === 'verified' ? (
        <>
          <InstructorBadge />
          <p className="mt-2 text-sm text-slate-600">Use the Student / Instructor switch at the top to move between learning and teaching.</p>
          <LinkButton to="/teaching" variant="secondary" size="sm" className="mt-3">
            Host a class
          </LinkButton>
        </>
      ) : status === 'pending' ? (
        <>
          <Badge tone="warning" icon={Clock}>
            Under review
          </Badge>
          <p className="mt-2 text-sm text-slate-600">An admin is reviewing your application. We’ll unlock instructor tools once it’s approved.</p>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-600">{status === 'rejected' ? 'Your last application wasn’t approved. You can update it and apply again.' : 'Host live classes for other students. An admin verifies every instructor first.'}</p>
          <LinkButton to="/instructor" variant="secondary" size="sm" icon={BadgeCheck} className="mt-3">
            {status === 'rejected' ? 'View feedback' : 'Become an instructor'}
          </LinkButton>
        </>
      )}
    </section>
  );
}

function SectionTitle({ id, title, subtitle, to, linkLabel }: { id: string; title: string; subtitle?: string; to?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 id={id} className="text-lg">
          {title}
        </h2>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="shrink-0 text-sm font-medium text-brand-700 hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export default function Dashboard() {
  usePageTitle('Dashboard');
  const user = useCurrentUser();
  const recommended = useFetch(() => api.recommended(4), []);
  const requests = useFetch(() => api.listRequests(), []);
  const now = useNow();
  // Classes I've joined plus, for verified instructors, the ones I host.
  const verified = user.instructor.status === 'verified';
  const classes = useFetch(async () => {
    const [joined, hosting] = await Promise.all([api.listSessions('joined'), verified ? api.listSessions('hosting') : Promise.resolve({ sessions: [] as ClassSession[] })]);
    return [...new Map([...joined.sessions, ...hosting.sessions].map((s) => [s.id, s])).values()];
  }, [verified]);
  const upcomingClasses = (classes.data ?? [])
    .filter((s) => ['upcoming', 'open'].includes(phaseAt(s, now)))
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
    .slice(0, 3);
  // Requests answered from this page stay on screen with their new status until the page is reloaded.
  const [answered, setAnswered] = useState<Record<string, ExchangeRequest>>({});

  const incoming = (requests.data?.incoming ?? []).map((r) => answered[r.id] ?? r);
  const pendingOnLoad = (requests.data?.incoming ?? []).filter((r) => r.status === 'pending').map((r) => answered[r.id] ?? r);
  const outgoing = requests.data?.outgoing ?? [];

  const loaded = requests.data !== null;
  const pendingCount = incoming.filter((r) => r.status === 'pending').length;
  const activeSwaps = [
    ...incoming.filter((r) => r.status === 'accepted').map((r) => ({ request: r, other: r.requester, iTeach: r.skillWanted, theyTeach: r.skillOffered })),
    ...outgoing.filter((r) => r.status === 'accepted').map((r) => ({ request: r, other: r.recipient, iTeach: r.skillOffered, theyTeach: r.skillWanted })),
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName(user.name)}`}
        subtitle="Ready to learn something new today?"
        action={
          <LinkButton to="/discover" icon={Search} size="lg">
            Find a Learning Partner
          </LinkButton>
        }
      />

      <section aria-label="Overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={GraduationCap} label="Skills I can teach" value={user.skillsOffered.length} to="/skills" />
        <StatCard icon={Sparkles} label="Skills I want to learn" value={user.skillsWanted.length} to="/skills" />
        <StatCard icon={Clock} label="Requests to answer" value={loaded ? pendingCount : undefined} to="/requests" />
        <StatCard icon={Handshake} label="Active swaps" value={loaded ? activeSwaps.length : undefined} to="/requests" />
      </section>

      <div className="mt-10 grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="pending-heading">
            <SectionTitle id="pending-heading" title="Pending requests" subtitle="Students waiting for your reply." to="/requests" linkLabel="View all" />
            {requests.loading && !requests.data ? (
              <LoadingList count={2} label="Loading requests…" />
            ) : requests.error ? (
              <ErrorState message={requests.error} onRetry={requests.reload} />
            ) : pendingOnLoad.length === 0 ? (
              <EmptyState icon={Inbox} title="You’re all caught up">
                When someone asks to swap skills with you, their request will appear here.
              </EmptyState>
            ) : (
              <div className="space-y-4">
                {pendingOnLoad.map((r) => (
                  <RequestCard key={r.id} request={r} direction="incoming" onUpdated={(updated) => setAnswered((a) => ({ ...a, [updated.id]: updated }))} />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="classes-heading">
            <SectionTitle id="classes-heading" title="Upcoming classes" subtitle="Live classes you’ve joined or host." to="/classes" linkLabel="Find a class" />
            {classes.loading && !classes.data ? (
              <LoadingList count={1} label="Loading classes…" />
            ) : classes.error ? (
              <ErrorState message={classes.error} onRetry={classes.reload} />
            ) : upcomingClasses.length === 0 ? (
              <EmptyState icon={CalendarX} title="No classes on your schedule" action={<LinkButton to="/classes" variant="secondary">Browse classes</LinkButton>}>
                Join a live class from a verified instructor and it will show up here.
              </EmptyState>
            ) : (
              <ul className="card divide-y divide-slate-100">
                {upcomingClasses.map((s) => (
                  <ClassRow key={s.id} session={s} now={now} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="recommended-heading">
            <SectionTitle id="recommended-heading" title="Recommended for you" subtitle="Students who can teach what you want to learn." to="/discover" linkLabel="Discover more" />
            {recommended.loading && !recommended.data ? (
              <LoadingGrid count={2} columns="md:grid-cols-2" label="Finding matches…" />
            ) : recommended.error ? (
              <ErrorState message={recommended.error} onRetry={recommended.reload} />
            ) : recommended.data!.students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No matches yet"
                action={
                  <LinkButton to={user.skillsWanted.length === 0 ? '/skills' : '/discover'} variant="secondary">
                    {user.skillsWanted.length === 0 ? 'Add skills you want to learn' : 'Browse all students'}
                  </LinkButton>
                }
              >
                {user.skillsWanted.length === 0 ? 'Tell us what you’d like to learn and we’ll suggest students who can teach it.' : 'Nobody teaches what you’re looking for yet. Browse everyone to find someone new.'}
              </EmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {recommended.data!.students.map((s) => (
                  <StudentCard key={s.id} student={s} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Your skills and swaps">
          <InstructorCard user={user} />

          <section className="card p-5" aria-labelledby="skills-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="skills-heading" className="text-base">
                My skills
              </h2>
              <Link to="/skills" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
                <Pencil size={14} aria-hidden /> Manage
              </Link>
            </div>
            <div className="space-y-4">
              <SkillList title="I can teach" skills={user.skillsOffered} tone="offered" emptyText="No skills added yet." />
              <SkillList title="I want to learn" skills={user.skillsWanted} tone="wanted" emptyText="No skills added yet." />
            </div>
          </section>

          <section className="card p-5" aria-labelledby="swaps-heading">
            <h2 id="swaps-heading" className="mb-4 text-base">
              Active swaps
            </h2>
            {requests.loading && !requests.data ? (
              <Skeleton className="h-16 w-full" />
            ) : activeSwaps.length === 0 ? (
              <p className="text-sm text-slate-600">Accepted requests show up here, with contact details so you can plan your first session.</p>
            ) : (
              <ul className="space-y-4">
                {activeSwaps.map(({ request, other, iTeach, theyTeach }) => (
                  <li key={request.id} className="flex items-start gap-3">
                    <Avatar name={other.name} size="sm" />
                    <div className="min-w-0 text-sm">
                      <Link to={`/students/${other.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                        {other.name}
                      </Link>
                      <p className="flex flex-wrap items-center gap-x-1 text-xs text-slate-600">
                        {/* Either side's skill can be blank: a one-directional request offers nothing back. */}
                        {iTeach && theyTeach ? (
                          <>
                            You teach {iTeach} <ArrowLeftRight size={12} aria-hidden /> {firstName(other.name)} teaches {theyTeach}
                          </>
                        ) : theyTeach ? (
                          <>{firstName(other.name)} is teaching you {theyTeach}</>
                        ) : (
                          <>You’re teaching {firstName(other.name)} {iTeach}</>
                        )}
                      </p>
                      {other.email && (
                        <a href={`mailto:${other.email}`} className="break-all text-xs font-medium text-brand-700 hover:underline">
                          {other.email}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
