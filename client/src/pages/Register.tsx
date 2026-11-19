import { UserPlus } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { PasswordField, TextField } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { focusFirstInvalid } from '../lib/dom';
import { ALLOWED_EMAIL_DOMAINS, hasErrors, validateRegisterForm, type FieldErrors } from '../lib/validation';

export default function Register() {
  usePageTitle('Create your account');
  const { user, register } = useAuth();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [form, setForm] = useState({ name: '', email: '', password: '', university: 'University of Hyderabad', department: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const found = validateRegisterForm(form);
    setErrors(found);
    setFormError(null);
    if (hasErrors(found)) return focusFirstInvalid(formRef.current);

    setSubmitting(true);
    try {
      await register({ ...form, name: form.name.trim(), email: form.email.trim(), university: form.university.trim(), department: form.department.trim() });
      toast.success('Account created! Welcome to Skill Swap.');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(Object.keys(err.fields).length > 0 ? null : err.message);
        focusFirstInvalid(formRef.current);
      } else {
        setFormError('Could not create your account. Please try again.');
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-2xl">Create your account</h1>
      <p className="mt-1 text-sm text-slate-600">Join fellow students trading skills on campus.</p>

      <form ref={formRef} onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {formError && <Alert variant="error">{formError}</Alert>}
        <TextField id="name" label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
        <TextField id="email" label="Email" type="email" autoComplete="email" placeholder={`you@${ALLOWED_EMAIL_DOMAINS[0]}`} value={form.email} onChange={set('email')} error={errors.email} hint="Use your university email — this is how we check you're a student." />
        <PasswordField id="password" label="Password" autoComplete="new-password" hint="At least 8 characters." value={form.password} onChange={set('password')} error={errors.password} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField id="university" label="University" value={form.university} onChange={set('university')} error={errors.university} />
          <TextField id="department" label="Department" placeholder="e.g. Computer Science" value={form.department} onChange={set('department')} error={errors.department} />
        </div>
        <Button type="submit" icon={UserPlus} loading={submitting} className="w-full" size="lg">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-700 underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
