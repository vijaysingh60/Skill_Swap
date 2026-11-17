import { Plus, Trash2 } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { capitalize } from '../lib/dom';
import { SKILL_LEVELS, type Skill, type SkillLevel } from '../types';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Field';

const MAX_SKILLS = 15;
const MAX_NAME = 40;
const key = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

const levelOptions = SKILL_LEVELS.map((level) => (
  <option key={level} value={level}>
    {capitalize(level)}
  </option>
));

interface Props {
  id: string;
  title: string;
  description: string;
  skills: Skill[];
  onChange: (skills: Skill[]) => void;
  placeholder: string;
  emptyText: string;
  error?: string;
}

export function SkillEditor({ id, title, description, skills, onChange, placeholder, emptyText, error }: Props) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState<SkillLevel>('beginner');
  const [localError, setLocalError] = useState<string | null>(null);

  const add = () => {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean) return setLocalError('Enter a skill name.');
    if (clean.length > MAX_NAME) return setLocalError(`Skill names can be at most ${MAX_NAME} characters.`);
    if (skills.some((s) => key(s.name) === key(clean))) return setLocalError(`"${clean}" is already in this list.`);
    if (skills.length >= MAX_SKILLS) return setLocalError(`You can list at most ${MAX_SKILLS} skills.`);
    onChange([...skills, { name: clean, level }]);
    setName('');
    setLocalError(null);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // adds the skill instead of submitting the surrounding form
      add();
    }
  };

  const shownError = localError ?? error;
  const draft = name.trim();

  return (
    <section aria-labelledby={`${id}-title`} className="card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`${id}-title`} className="text-base">
          {title}
        </h2>
        <span className="text-xs text-slate-500">
          {skills.length}/{MAX_SKILLS}
        </span>
      </div>
      <p className="mb-4 mt-1 text-sm text-slate-600">{description}</p>

      {skills.length === 0 ? (
        <p className="mb-4 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {skills.map((skill) => (
            <li key={skill.name} className="flex items-center gap-2 py-2 pl-3 pr-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{skill.name}</span>
              <div className="w-36 shrink-0">
                <Select
                  aria-label={`Level for ${skill.name}`}
                  className="h-8 py-0 text-xs"
                  value={skill.level}
                  onChange={(e) => onChange(skills.map((s) => (s === skill ? { ...s, level: e.target.value as SkillLevel } : s)))}
                >
                  {levelOptions}
                </Select>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Remove ${skill.name}`}
                onClick={() => onChange(skills.filter((s) => s !== skill))}
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={id}
          className="flex-1"
          placeholder={placeholder}
          value={name}
          invalid={!!shownError}
          maxLength={MAX_NAME + 10}
          aria-label={`Add a skill to: ${title}`}
          aria-describedby={shownError ? `${id}-error` : undefined}
          onChange={(e) => {
            setName(e.target.value);
            setLocalError(null);
          }}
          onKeyDown={onKeyDown}
        />
        <div className="sm:w-40">
          <Select aria-label="Skill level" value={level} onChange={(e) => setLevel(e.target.value as SkillLevel)}>
            {levelOptions}
          </Select>
        </div>
        <Button variant="secondary" icon={Plus} onClick={add}>
          Add
        </Button>
      </div>
      {shownError ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-rose-600">
          {shownError}
        </p>
      ) : (
        draft && <p className="mt-1.5 text-xs text-amber-700">Press Add (or Enter) to include “{draft}”. It isn’t in your list until you do.</p>
      )}
    </section>
  );
}
