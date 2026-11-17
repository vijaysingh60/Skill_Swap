import { BadgeCheck, CalendarX, Search, SearchX, Video, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client';
import { ClassCard } from '../components/ClassCard';
import { Button, LinkButton } from '../components/ui/Button';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingGrid } from '../components/ui/Skeleton';
import { useCurrentUser } from '../context/AuthContext';
import { useDebounced } from '../hooks/useDebounced';
import { useFetch } from '../hooks/useFetch';
import { useNow } from '../hooks/useNow';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/cn';
import { phaseAt } from '../lib/time';
import type { ClassSession } from '../types';

type Tab = 'browse' | 'joined';

export default function Classes() {
  usePageTitle('Classes');
  const user = useCurrentUser();
  const now = useNow();
  const [tab, setTab] = useState<Tab>('browse');
  const [input, setInput] = useState('');
  const q = useDebounced(input.trim());

  const { data, error, loading, reload, setData } = useFetch(() => api.listSessions(tab, { q }), [tab, q]);

  // Keep the list in sync with joins and leaves done on the cards.
  const replace = (updated: ClassSession) =>
    setData((current) => {
      if (!current) return current;
      const keep = tab === 'joined' ? updated.joined : true; // leaving a class removes it from "My classes"
      return { sessions: current.sessions.flatMap((s) => (s.id !== updated.id ? [s] : keep ? [updated] : [])) };
    });

  const sessions = data?.sessions ?? [];
  const upcoming = sessions.filter((s) => ['upcoming', 'open'].includes(phaseAt(s, now)));
  const past = sessions.filter((s) => !['upcoming', 'open'].includes(phaseAt(s, now)));
  const verified = user.instructor.status === 'verified';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'browse', label: 'Find a class' },
    { id: 'joined', label: 'My classes' },
  ];

  return (
    <div>
      <PageHeader
        title="Live classes"
        subtitle="Join a class hosted by a verified instructor, and learn over live video."
        action={
          verified ? (
            <LinkButton to="/teaching" variant="secondary" icon={BadgeCheck}>
              Host a class
            </LinkButton>
          ) : (
            <LinkButton to="/instructor" variant="secondary" icon={BadgeCheck}>
              Become an instructor
            </LinkButton>
          )
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Classes" className="inline-grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 sm:w-80">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', tab === id ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} aria-hidden />
          <Input type="search" className="pl-9 pr-9" placeholder="Search by topic or skill" aria-label="Search classes" maxLength={50} value={input} onChange={(e) => setInput(e.target.value)} />
          {input && (
            <button type="button" onClick={() => setInput('')} aria-label="Clear search" className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>

      <div role="tabpanel">
        {loading && !data ? (
          <LoadingGrid label="Loading classes…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : sessions.length === 0 ? (
          q ? (
            <EmptyState icon={SearchX} title="No classes found" action={<Button variant="secondary" onClick={() => setInput('')}>Clear search</Button>}>
              Nothing matches “{q}”. Try a different topic.
            </EmptyState>
          ) : tab === 'browse' ? (
            <EmptyState
              icon={CalendarX}
              title="No classes scheduled yet"
              action={
                <LinkButton to={verified ? '/teaching' : '/instructor'} variant="secondary">
                  {verified ? 'Schedule the first one' : 'Become an instructor'}
                </LinkButton>
              }
            >
              New classes appear here as soon as a verified instructor schedules them. Check back soon.
            </EmptyState>
          ) : (
            <EmptyState icon={Video} title="You haven’t joined any classes" action={<Button onClick={() => setTab('browse')}>Find a class</Button>}>
              Classes you join show up here, with a button to enter the video room when it opens.
            </EmptyState>
          )
        ) : (
          <div className="space-y-10">
            {upcoming.length > 0 && (
              <section aria-label="Upcoming classes" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((s) => (
                  <ClassCard key={s.id} session={s} onChange={replace} />
                ))}
              </section>
            )}
            {past.length > 0 && (
              <section aria-labelledby="past-heading">
                <h2 id="past-heading" className="mb-3 text-base text-slate-700">
                  Past and cancelled
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {past.map((s) => (
                    <ClassCard key={s.id} session={s} onChange={replace} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
