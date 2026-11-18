import { Send } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { focusFirstInvalid } from '../lib/dom';
import type { CurrentUser, ExchangeRequest, Student } from '../types';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { SelectField, TextAreaField } from './ui/Field';
import { useToast } from './ui/Toast';

interface Props {
  student: Student;
  me: CurrentUser;
  onSent: (request: ExchangeRequest) => void;
}

const MESSAGE_MAX = 500;

export function RequestForm({ student, me, onSent }: Props) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  // Pre-select skills that actually match, otherwise the first available.
  const [skillWanted, setSkillWanted] = useState(student.match?.theyCanTeachMe[0] ?? student.skillsOffered[0]?.name ?? '');
  const [skillOffered, setSkillOffered] = useState(student.match?.iCanTeachThem[0] ?? me.skillsOffered[0]?.name ?? '');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (student.skillsOffered.length === 0) {
    return <Alert variant="info">{student.name} hasn’t listed any skills to teach yet, so there is nothing to request.</Alert>;
  }
  // A student with nothing to teach yet can still ask to learn — it's sent as a one-directional
  // request instead of a swap. Trading a skill back is encouraged (pre-selected below) but optional.
  const canOffer = me.skillsOffered.length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const found: Record<string, string> = {};
    if (!skillWanted) found.skillWanted = 'Choose the skill you want to learn.';
    if (message.length > MESSAGE_MAX) found.message = `Message must be at most ${MESSAGE_MAX} characters.`;
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSubmitting(true);
    try {
      const { request } = await api.createRequest({ recipientId: student.id, skillWanted, skillOffered, message });
      setMessage('');
      toast.success(`Request sent to ${student.name}.`);
      onSent(request);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(Object.keys(err.fields).length > 0 ? null : err.message);
        focusFirstInvalid(formRef.current);
      } else {
        setFormError('Could not send the request. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
      <SelectField id="skillWanted" label="I want to learn" error={errors.skillWanted} value={skillWanted} onChange={(e) => setSkillWanted(e.target.value)}>
        {student.skillsOffered.map((s) => (
          <option key={s.name} value={s.name}>
            {s.name}
          </option>
        ))}
      </SelectField>
      {canOffer ? (
        <SelectField id="skillOffered" label="I can teach in exchange (optional)" error={errors.skillOffered} value={skillOffered} onChange={(e) => setSkillOffered(e.target.value)}>
          <option value="">Nothing — just ask to learn</option>
          {me.skillsOffered.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </SelectField>
      ) : (
        <Alert variant="info">
          You don’t have any skills to offer yet, so this will be sent as a plain request to learn.{' '}
          <Link to="/skills" className="font-medium underline underline-offset-2">
            Add a skill
          </Link>{' '}
          later if you’d like to offer one in return.
        </Alert>
      )}
      <TextAreaField
        id="message"
        label="Message (optional)"
        rows={3}
        placeholder="Say hi and suggest when you could meet…"
        error={errors.message}
        hint={`${message.length}/${MESSAGE_MAX}`}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {formError && <Alert variant="error">{formError}</Alert>}
      <Button type="submit" icon={Send} loading={submitting} className="w-full">
        Send request
      </Button>
    </form>
  );
}
