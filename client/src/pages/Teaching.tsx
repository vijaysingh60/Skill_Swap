import { CalendarPlus, GraduationCap, Presentation, Users, Video } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { ClassCard } from '../components/ClassCard';
import { ScheduleClassDialog } from '../components/ScheduleClassDialog';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingGrid } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useAuth, useCurrentUser } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { useNow } from '../hooks/useNow';
import { usePageTitle } from '../hooks/usePageTitle';
import { phaseAt } from '../lib/time';
import type { ClassSession } from '../types';

export default function Teaching() {
  usePageTitle('Teaching');
  const user = useCurrentUser();
  const { setUser } = useAuth();
  const toast = useToast();
  const now = useNow();
  const [scheduling, setScheduling] = useState(false);
  const [switching, setSwitching] = useState(false);

  const verified = user.instructor.status === 'verified';
  const teaching = verified && user.mode === 'instructor';
  // Only fetch once we know this person may host.
  const { data, error, loading, reload, setData } = useFetch(() => (teaching ? api.listSessions('hosting') : Promise.resolve({ sessions: [] as ClassSession[] })), [teaching]);

  if (!verified) return <Navigate to="/instructor" replace />;

  if (!teaching) {
    const switchToInstructor = async () => {
      setSwitching(true);
      try {
        const { user: updated } = await api.setMode('instructor');
        setUser(updated);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Could not switch mode.');
      } finally {
        setSwitching(false);
      }
    };
    return (
      <div className="mx-auto max-w-2xl pt-6">
        <EmptyState icon={Presentation} title="You’re in student mode" action={<Button loading={switching} onClick={switchToInstructor}>Switch to instructor mode</Button>}>
          Switch to instructor mode to schedule classes and see who has signed up.
        </EmptyState>
      </div>
    );
  }

  const sessions = data?.sessions ?? [];
  const upcoming = sessions.filter((s) => ['upcoming', 'open'].includes(phaseAt(s, now)));
  const past = sessions.filter((s) => !['upcoming', 'open'].includes(phaseAt(s, now))).reverse();
  const signedUp = upcoming.reduce((sum, s) => sum + s.attendeeCount, 0);
  const taught = sessions.filter((s) => phaseAt(s, now) === 'ended').length;

  const replace = (updated: ClassSession) => setData((c) => c && { sessions: c.sessions.map((s) => (s.id === updated.id ? updated : s)) });
  const added = (created: ClassSession) => setData((c) => ({ sessions: [...(c?.sessions ?? []), created].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)) }));

  const stats = [
    { icon: Video, label: 'Upcoming classes', value: upcoming.length },
    { icon: Users, label: 'Students signed up', value: signedUp },
    { icon: GraduationCap, label: 'Classes taught', value: taught },
  ];

  return (
    <div>
      <PageHeader
        title="Teaching"
        subtitle={user.instructor.headline ? `${user.instructor.headline}. Schedule classes and meet your students.` : 'Schedule classes and meet your students.'}
        action={
          <Button size="lg" icon={CalendarPlus} onClick={() => setScheduling(true)}>
            Schedule a class
          </Button>
        }
      />

      <section aria-label="Overview" className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="card flex items-center gap-3 p-4">
            <span className="icon-tile">
              <Icon size={20} aria-hidden />
            </span>
            <span>
              <span className="block text-2xl font-semibold leading-tight text-slate-900">{loading && !data ? '–' : value}</span>
              <span className="block text-xs text-slate-600">{label}</span>
            </span>
          </div>
        ))}
      </section>

      {loading && !data ? (
        <LoadingGrid label="Loading your classes…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <div className="space-y-10">
          <section aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className="mb-3 text-lg">
              Upcoming classes
            </h2>
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarPlus} title="No classes scheduled" action={<Button icon={CalendarPlus} onClick={() => setScheduling(true)}>Schedule your first class</Button>}>
                Pick a topic and a time. Students can join until it’s full, and the video room opens 15 minutes before you start.
              </EmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((s) => (
                  <ClassCard key={s.id} session={s} onChange={replace} />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section aria-labelledby="past-heading">
              <h2 id="past-heading" className="mb-3 text-lg">
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

      <ScheduleClassDialog open={scheduling} onClose={() => setScheduling(false)} onCreated={added} skills={user.skillsOffered} />
    </div>
  );
}
