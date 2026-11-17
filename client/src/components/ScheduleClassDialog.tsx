import { CalendarPlus } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import { focusFirstInvalid } from '../lib/dom';
import { toLocalInputValue } from '../lib/time';
import { hasErrors, type FieldErrors } from '../lib/validation';
import type { ClassSession, Skill } from '../types';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { SelectField, TextAreaField, TextField } from './ui/Field';
import { useToast } from './ui/Toast';

const DURATIONS = [30, 45, 60, 90, 120, 180];
const MIN_LEAD_MINUTES = 5;

/** Next whole hour, at least an hour away: a sensible default start. */
function defaultStart() {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toLocalInputValue(d);
}

const blank = () => ({ title: '', skill: '', description: '', startsAt: defaultStart(), durationMinutes: '60', capacity: '20' });

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (session: ClassSession) => void;
  /** The instructor's own skills, offered as suggestions. */
  skills: Skill[];
}

export function ScheduleClassDialog({ open, onClose, onCreated, skills }: Props) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Start fresh each time the dialog opens.
  useEffect(() => {
    if (open) {
      setForm(blank());
      setErrors({});
      setFormError(null);
    }
  }, [open]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [field]: e.target.value });

  const validate = (): FieldErrors => {
    const found: FieldErrors = {};
    const title = form.title.trim();
    if (title.length < 3) found.title = title ? 'Title must be at least 3 characters.' : 'Title is required.';
    else if (title.length > 80) found.title = 'Title must be at most 80 characters.';
    const skill = form.skill.trim();
    if (!skill) found.skill = 'Choose or type the skill this class teaches.';
    else if (skill.length > 40) found.skill = 'Skill must be at most 40 characters.';
    if (form.description.length > 500) found.description = 'Description must be at most 500 characters.';
    const start = new Date(form.startsAt);
    if (!form.startsAt || Number.isNaN(start.getTime())) found.startsAt = 'Choose a date and time.';
    else if (start.getTime() < Date.now() + MIN_LEAD_MINUTES * 60_000) found.startsAt = `Start at least ${MIN_LEAD_MINUTES} minutes from now.`;
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) found.capacity = 'Enter a whole number from 1 to 100.';
    return found;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const found = validate();
    setErrors(found);
    setFormError(null);
    if (hasErrors(found)) return focusFirstInvalid(formRef.current);

    setSubmitting(true);
    try {
      const { session } = await api.createSession({
        title: form.title.trim(),
        skill: form.skill.trim(),
        description: form.description.trim(),
        startsAt: new Date(form.startsAt).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        capacity: Number(form.capacity),
      });
      toast.success(`“${session.title}” is scheduled.`);
      onCreated(session);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(Object.keys(err.fields).length > 0 ? null : err.message);
        focusFirstInvalid(formRef.current);
      } else {
        setFormError('Could not schedule the class. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !submitting && onClose()}
      title="Schedule a class"
      description="Students can join until it’s full. The video room opens 15 minutes before the start."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="schedule-form" icon={CalendarPlus} loading={submitting}>
            Schedule class
          </Button>
        </>
      }
    >
      <form id="schedule-form" ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
        {formError && <Alert variant="error">{formError}</Alert>}
        <TextField id="class-title" label="Title" placeholder="e.g. Python from zero" value={form.title} onChange={set('title')} error={errors.title} />
        <div>
          <TextField id="class-skill" label="Skill" list="my-skills" placeholder="e.g. Python" value={form.skill} onChange={set('skill')} error={errors.skill} />
          <datalist id="my-skills">
            {skills.map((s) => (
              <option key={s.name} value={s.name} />
            ))}
          </datalist>
        </div>
        <TextField id="class-start" label="Date and time" type="datetime-local" value={form.startsAt} onChange={set('startsAt')} error={errors.startsAt} hint="Shown to students in their own time zone." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField id="class-duration" label="Duration" value={form.durationMinutes} onChange={set('durationMinutes')} error={errors.durationMinutes}>
            {DURATIONS.map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </SelectField>
          <TextField id="class-capacity" label="Seats" type="number" min={1} max={100} value={form.capacity} onChange={set('capacity')} error={errors.capacity} />
        </div>
        <TextAreaField
          id="class-description"
          label="What will students learn? (optional)"
          rows={3}
          value={form.description}
          onChange={set('description')}
          error={errors.description}
          hint={`${form.description.length}/500`}
        />
      </form>
    </Dialog>
  );
}
