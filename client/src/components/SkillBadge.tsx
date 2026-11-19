import { cn } from '../lib/cn';
import { capitalize } from '../lib/dom';
import type { Skill, SkillLevel } from '../types';

const LEVEL_DOTS: Record<SkillLevel, number> = { beginner: 1, intermediate: 2, advanced: 3 };

/** Three dots, filled according to proficiency. */
function LevelDots({ level }: { level: SkillLevel }) {
  return (
    <span aria-hidden className="inline-flex items-center gap-0.5">
      {[1, 2, 3].map((dot) => (
        <span key={dot} className={cn('h-1.5 w-1.5 rounded-full bg-current', dot > LEVEL_DOTS[level] && 'opacity-25')} />
      ))}
    </span>
  );
}

interface Props {
  skill: Skill;
  /** "offered" = a skill they can teach, "wanted" = a skill they want to learn. */
  tone: 'offered' | 'wanted';
  /** Emphasise skills that match the current user. */
  highlight?: boolean;
  /** Spell the level out instead of showing dots only. */
  showLevel?: boolean;
}

export function SkillBadge({ skill, tone, highlight, showLevel }: Props) {
  const style = highlight
    ? 'border-brand-300 bg-brand-100 text-brand-800'
    : tone === 'offered'
      ? 'border-brand-100 bg-brand-50 text-brand-800'
      : 'border-violet-200 bg-white text-violet-700';
  return (
    <span title={`${skill.name} · ${capitalize(skill.level)}`} className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium', style)}>
      {skill.name}
      <LevelDots level={skill.level} />
      <span className={showLevel ? 'font-normal opacity-80' : 'sr-only'}>{capitalize(skill.level)}</span>
    </span>
  );
}
