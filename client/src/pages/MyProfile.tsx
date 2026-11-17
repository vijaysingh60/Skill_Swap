import { GraduationCap, Save } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { InstructorBadge } from '../components/InstructorBadge';
import { SkillList } from '../components/SkillList';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { TextAreaField, TextField } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import { useAuth, useCurrentUser } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { focusFirstInvalid } from '../lib/dom';
import { hasErrors, validateProfileForm, type FieldErrors } from '../lib/validation';

const BIO_MAX = 300;

export default function MyProfile() {
  usePageTitle('My Profile');
  const user = useCurrentUser();
  const { setUser } = useAuth();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [form, setForm] = useState({ name: user.name, university: user.university, department: user.department, bio: user.bio });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const found = validateProfileForm(form);
    setErrors(found);
    setFormError(null);
    if (hasErrors(found)) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      const { user: updated } = await api.updateProfile(form);
      setUser(updated);
      toast.success('Profile saved.');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(err.message);
        focusFirstInvalid(formRef.current);
      } else {
        setFormError('Could not save your profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="My profile" subtitle="This is how other students see you on Skill Swap." />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form ref={formRef} onSubmit={submit} className="card space-y-5 p-5 sm:p-6" noValidate>
          <h2 className="text-base">About you</h2>
          <TextField id="name" label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
          <TextField id="email" label="Email" value={user.email} disabled hint="Only shared with students whose requests you accept, or who accept yours." />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextField id="university" label="University" value={form.university} onChange={set('university')} error={errors.university} />
            <TextField id="department" label="Department" value={form.department} onChange={set('department')} error={errors.department} />
          </div>
          <TextAreaField
            id="bio"
            label="Bio"
            rows={4}
            placeholder="A sentence or two about you and what you’d like to learn."
            value={form.bio}
            onChange={set('bio')}
            error={errors.bio}
            hint={`${form.bio.length}/${BIO_MAX}`}
          />
          {formError && <Alert variant="error">{formError}</Alert>}
          <Button type="submit" icon={Save} loading={saving}>
            Save profile
          </Button>
        </form>

        <aside className="card p-5 lg:sticky lg:top-24" aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-500">
            Public preview
          </h2>
          <div className="flex items-center gap-3">
            <Avatar name={form.name || user.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900">{form.name.trim() || 'Your name'}</p>
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <GraduationCap size={14} aria-hidden />
                <span className="truncate">{form.department.trim() || 'Department'}</span>
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600">{form.bio.trim() || 'Your bio will appear here.'}</p>
          <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
            <SkillList title="Can teach" skills={user.skillsOffered} tone="offered" emptyText="No skills added yet." max={5} />
            <SkillList title="Wants to learn" skills={user.skillsWanted} tone="wanted" emptyText="No skills added yet." max={5} />
          </div>
          <Link to="/skills" className="mt-5 inline-block text-sm font-medium text-brand-700 hover:underline">
            Manage your skills
          </Link>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Instructor status</h3>
            {user.instructor.status === 'verified' && <InstructorBadge />}
            {user.instructor.status === 'pending' && <Badge tone="warning">Under review</Badge>}
            {user.instructor.status === 'rejected' && <Badge tone="danger">Not approved</Badge>}
            {user.instructor.status === 'none' && <p className="text-sm text-slate-600">You’re a student.</p>}
            <Link to={user.instructor.status === 'verified' ? '/teaching' : '/instructor'} className="mt-3 block text-sm font-medium text-brand-700 hover:underline">
              {{ none: 'Become an instructor', pending: 'View your application', rejected: 'See feedback and reapply', verified: 'Go to Teaching' }[user.instructor.status]}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
