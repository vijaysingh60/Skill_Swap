import { useId } from 'react';
import type { Skill } from '../types';
import { SkillBadge } from './SkillBadge';

const key = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

interface Props {
  title?: string;
  skills: Skill[];
  tone: 'offered' | 'wanted';
  emptyText: string;
  /** Names of skills to emphasise (e.g. the ones that match the viewer). */
  highlight?: string[];
  /** Show at most this many tags, then "+N more". */
  max?: number;
  showLevel?: boolean;
}

export function SkillList({ title, skills, tone, emptyText, highlight = [], max, showLevel }: Props) {
  const highlighted = new Set(highlight.map(key));
  // Keep matching skills visible even when the list is truncated.
  const ordered = [...skills].sort((a, b) => Number(highlighted.has(key(b.name))) - Number(highlighted.has(key(a.name))));
  const shown = max ? ordered.slice(0, max) : ordered;
  const hidden = ordered.length - shown.length;
  const labelId = useId();

  return (
    <div>
      {/* A label for the list, not a heading: these sit inside cards that already have their own headings. */}
      {title && (
        <p id={labelId} className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
          {title}
        </p>
      )}
      {skills.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul aria-labelledby={title ? labelId : undefined} className="flex flex-wrap items-center gap-1.5">
          {shown.map((skill) => (
            <li key={skill.name}>
              <SkillBadge skill={skill} tone={tone} highlight={highlighted.has(key(skill.name))} showLevel={showLevel} />
            </li>
          ))}
          {hidden > 0 && <li className="text-xs text-slate-500">+{hidden} more</li>}
        </ul>
      )}
    </div>
  );
}
