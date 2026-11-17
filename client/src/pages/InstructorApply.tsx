import { BadgeCheck, Clock, Presentation, Send } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { TextAreaField, TextField } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { useAuth, useCurrentUser } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { focusFirstInvalid, formatDate } from '../lib/dom';
import { hasErrors, type FieldErrors } from '../lib/validation';

const steps = ['Apply with a short note about what you’d teach', 'An admin reviews your application', 'Once verified, schedule live classes and switch between student and instructor mode'];

export default function InstructorApply() {
  usePageTitle('Become an instructor');
  const user = useCurrentUser();
  const { setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const { status, reviewNote, appliedAt } = user.instructor;

  const [form, setForm] = useState({ headline: user.instructor.headline, experience: user.instructor.experience });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [switching, setSwitching] = useState(false);

  const hasSkills = user.skillsOffered.length > 0;
  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const found: FieldErrors = {};
    const headline = form.headline.trim();
    const experience = form.experience.trim();
    if (headline.length < 5) found.headline = headline ? 'Headline must be at least 5 characters.' : 'Headline is required.';
    if (experience.length < 30) found.experience = experience ? 'Tell us a bit more: at least 30 characters.' : 'Experience is required.';
    else if (experience.length > 800) found.experience = 'Experience must be at most 800 characters.';
    setErrors(found);
    setFormError(null);
    if (hasErrors(found)) return focusFirstInvalid(formRef.current);

    setSubmitting(true);
    try {
      const { user: updated } = await api.applyToTeach(headline, experience);
      setUser(updated);
      toast.success('Application submitted. An admin will review it soon.');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(err.message);
        focusFirstInvalid(formRef.current);
      } else {
        setFormError('Could not submit your application. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const startTeaching = async () => {
    setSwitching(true);
    try {
      const { user: updated } = await api.setMode('instructor');
      setUser(updated);
      navigate('/teaching');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not switch mode.');
      setSwitching(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Become an instructor" subtitle="Teach live classes to other students. Every instructor is verified by an admin first." />

      {status === 'verified' && (
        <section className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <BadgeCheck size={26} aria-hidden />
            </span>
            <div>
              <h2 className="text-lg">You’re a verified instructor</h2>
              <p className="mt-0.5 text-sm text-slate-600">{user.instructor.headline}</p>
              <p className="mt-2 text-sm text-slate-600">Use the Student / Instructor switch at the top to move between learning and teaching any time.</p>
            </div>
          </div>
          <Button icon={Presentation} loading={switching} onClick={user.mode === 'instructor' ? () => navigate('/teaching') : startTeaching}>
            {user.mode === 'instructor' ? 'Go to Teaching' : 'Start teaching'}
          </Button>
        </section>
      )}

      {status === 'pending' && (
        <section className="card space-y-4 p-6">
          <Alert variant="info">
            <strong className="font-semibold">Your application is under review.</strong> Instructor tools unlock as soon as an admin approves it.
          </Alert>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Badge tone="warning" icon={Clock}>
              Pending
            </Badge>
            {appliedAt && <span>Submitted {formatDate(appliedAt)}</span>}
          </div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Headline</dt>
              <dd className="mt-0.5 text-slate-900">{user.instructor.headline}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Experience</dt>
              <dd className="mt-0.5 whitespace-pre-line text-slate-700">{user.instructor.experience}</dd>
            </div>
          </dl>
        </section>
      )}

      {(status === 'none' || status === 'rejected') && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <form ref={formRef} onSubmit={submit} className="card space-y-5 p-5 sm:p-6" noValidate>
            {status === 'rejected' && (
              <Alert variant="error">
                <strong className="font-semibold">Your last application wasn’t approved.</strong>
                {reviewNote && <span className="mt-0.5 block">“{reviewNote}”</span>}
                <span className="mt-0.5 block">You can update it and apply again.</span>
              </Alert>
            )}
            {!hasSkills && (
              <Alert variant="info">
                You need at least one skill you can teach first.{' '}
                <Link to="/skills" className="font-medium underline underline-offset-2">
                  Add it on My Skills
                </Link>
                .
              </Alert>
            )}
            {formError && hasSkills && <Alert variant="error">{formError}</Alert>}
            <TextField id="headline" label="Headline" placeholder="e.g. Python and data structures tutor" maxLength={80} value={form.headline} onChange={set('headline')} error={errors.headline} hint="What you’d teach, in a few words." />
            <TextAreaField
              id="experience"
              label="Experience and credentials"
              rows={6}
              placeholder="Courses you’ve taught or assisted, years of practice, projects, awards…"
              maxLength={800}
              value={form.experience}
              onChange={set('experience')}
              error={errors.experience}
              hint={`${form.experience.length}/800. The admin reviewing your application will read this.`}
            />
            <Button type="submit" icon={Send} loading={submitting} disabled={!hasSkills}>
              Submit application
            </Button>
          </form>

          <aside className="card p-5" aria-labelledby="steps-heading">
            <h2 id="steps-heading" className="mb-3 text-base">
              How it works
            </h2>
            <ol className="space-y-3 text-sm text-slate-600">
              {steps.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}
    </div>
  );
}
