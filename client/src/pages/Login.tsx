import { LogIn } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { PasswordField, TextField } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { focusFirstInvalid } from '../lib/dom';
import { hasErrors, validateLoginForm, type FieldErrors } from '../lib/validation';

export default function Login() {
  usePageTitle('Log in');
  const { user, login } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Always land on the dashboard. The previous version deep-linked back to
  // `location.state.from`, but that state is attached to the browser history
  // entry, not to any one person: if student A was on /requests and got
  // logged out, the /login entry still carries state.from = "/requests", and
  // student B signing in right after on the same device would be dropped
  // onto A's old page instead of their own dashboard.
  if (user) return <Navigate to="/dashboard" replace />;

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const found = validateLoginForm(form);
    setErrors(found);
    setFormError(null);
    if (hasErrors(found)) return focusFirstInvalid(formRef.current);

    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setFormError(err.message);
      } else {
        setFormError('Could not log in. Please try again.');
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-2xl">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-600">Log in to pick up where you left off.</p>

      <form ref={formRef} onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {formError && <Alert variant="error">{formError}</Alert>}
        <TextField id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordField id="password" label="Password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />
        <Button type="submit" icon={LogIn} loading={submitting} className="w-full" size="lg">
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New to Skill Swap?{' '}
        <Link to="/register" className="font-medium text-brand-700 underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
