import { ArrowLeft, GraduationCap } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ClassCard } from '../components/ClassCard';
import { InstructorBadge } from '../components/InstructorBadge';
import { MatchNote } from '../components/MatchNote';
import { SkillList } from '../components/SkillList';
import { Avatar } from '../components/ui/Avatar';
import { ErrorState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useCurrentUser } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { firstName } from '../lib/dom';
import type { ClassSession } from '../types';

function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading profile…" className="space-y-6">
      <div className="card space-y-4 p-6">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

export default function StudentProfile() {
  const { id = '' } = useParams();
  const me = useCurrentUser();
  const { data, error, loading, reload } = useFetch(() => api.getStudent(id), [id]);
  const student = data?.student;
  usePageTitle(student?.name ?? 'Student profile');
  // A verified instructor's upcoming classes, shown right on their profile.
  const classes = useFetch(() => (student?.isInstructor ? api.listSessions('browse', { instructor: id }) : Promise.resolve({ sessions: [] as ClassSession[] })), [id, student?.isInstructor]);

  if (id === me.id) return <Navigate to="/profile" replace />;

  return (
    <div>
      <Link to="/discover" className="mb-4 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} aria-hidden /> Back to Discover
      </Link>

      {loading && !student ? (
        <ProfileSkeleton />
      ) : error || !student ? (
        <ErrorState message={error ?? 'Student not found.'} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          <section className="card overflow-hidden" aria-label="Profile">
            <div className="h-20 bg-brand-50" aria-hidden />
            <div className="px-6 pb-6">
              <Avatar name={student.name} size="xl" className="-mt-10 border-4 border-white" />
              <h1 className="mt-4 text-2xl">{student.name}</h1>
              {student.isInstructor && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <InstructorBadge />
                  {student.instructorHeadline && <span className="text-sm text-slate-600">{student.instructorHeadline}</span>}
                </div>
              )}
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                <GraduationCap size={16} aria-hidden />
                {student.department}, {student.university}
              </p>
              {student.bio ? <p className="mt-4 max-w-prose text-base text-slate-700">{student.bio}</p> : <p className="mt-4 text-sm text-slate-500">{firstName(student.name)} hasn’t written a bio yet.</p>}
              {student.match && student.match.theyCanTeachMe.length > 0 && (
                <div className="mt-4">
                  <MatchNote match={student.match} />
                </div>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="card p-5" aria-labelledby="teach-heading">
              <h2 id="teach-heading" className="mb-3 text-base">
                {firstName(student.name)} can help you learn
              </h2>
              <SkillList skills={student.skillsOffered} tone="offered" emptyText="No skills listed yet." highlight={student.match?.theyCanTeachMe} showLevel />
            </section>
            <section className="card p-5" aria-labelledby="learn-heading">
              <h2 id="learn-heading" className="mb-3 text-base">
                {firstName(student.name)} wants to learn
              </h2>
              <SkillList skills={student.skillsWanted} tone="wanted" emptyText="No skills listed yet." highlight={student.match?.iCanTeachThem} showLevel />
            </section>
          </div>

          {classes.data && classes.data.sessions.length > 0 && (
            <section aria-labelledby="classes-heading">
              <h2 id="classes-heading" className="mb-3 text-lg">
                Upcoming classes by {firstName(student.name)}
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {classes.data.sessions.map((s) => (
                  <ClassCard key={s.id} session={s} onChange={(updated) => classes.setData((c) => c && { sessions: c.sessions.map((x) => (x.id === updated.id ? updated : x)) })} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
