import { ArrowLeftRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Student } from '../types';
import { InstructorBadge } from './InstructorBadge';
import { MatchNote } from './MatchNote';
import { SkillList } from './SkillList';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { LinkButton } from './ui/Button';

export function StudentCard({ student }: { student: Student }) {
  const { match } = student;
  return (
    <article className="card flex h-full flex-col gap-4 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <Avatar name={student.name} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base">
            <Link to={`/students/${student.id}`} className="rounded-sm hover:text-brand-700">
              {student.name}
            </Link>
          </h3>
          <p className="truncate text-xs text-slate-500" title={`${student.department}, ${student.university}`}>
            {student.department}
          </p>
        </div>
        {match?.mutual && (
          <Badge tone="brand" icon={ArrowLeftRight}>
            Mutual
          </Badge>
        )}
      </div>

      {student.isInstructor && (
        <div className="flex min-w-0 items-center gap-2">
          <InstructorBadge />
          {student.instructorHeadline && <span className="truncate text-xs text-slate-500">{student.instructorHeadline}</span>}
        </div>
      )}

      {student.bio ? <p className="line-clamp-2 text-sm text-slate-600">{student.bio}</p> : <p className="text-sm italic text-slate-500">No bio yet.</p>}
      <MatchNote match={match} />

      <div className="flex flex-1 flex-col gap-3">
        <SkillList title="Can teach" skills={student.skillsOffered} tone="offered" emptyText="Nothing listed yet" highlight={match?.theyCanTeachMe} max={3} />
        <SkillList title="Wants to learn" skills={student.skillsWanted} tone="wanted" emptyText="Nothing listed yet" highlight={match?.iCanTeachThem} max={3} />
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-2">
        <LinkButton to={`/students/${student.id}`} variant="secondary" size="sm">
          View profile
        </LinkButton>
        <LinkButton to={`/students/${student.id}#request`} size="sm">
          Request session
        </LinkButton>
      </div>
    </article>
  );
}
