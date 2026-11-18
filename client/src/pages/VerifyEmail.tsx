import { CircleCheck, LoaderCircle, MailQuestion, Send } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

type Status = 'checking' | 'success' | 'error';

/** Resend form shown once a verification link turns out to be missing, wrong or expired. */
function ResendForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.resendVerification(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return <Alert variant="success">If that email needs verifying, a new link is on its way. Check your inbox (and spam folder).</Alert>;
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <TextField id="resend-email" label="Your email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" icon={Send} loading={submitting} className="w-full">
        Resend verification email
      </Button>
    </form>
  );
}

export default function VerifyEmail() {
  usePageTitle('Verify your email');
  const [params] = useSearchParams();
  const token = params.get('token');
  const { applySession } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>(token ? 'checking' : 'error');
  const [message, setMessage] = useState('This link is missing its verification code.');
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true; // the token is single-use server-side; never call this twice (e.g. React StrictMode)
    api
      .verifyEmail(token)
      .then(({ token: sessionToken, user }) => {
        applySession(sessionToken, user);
        setStatus('success');
      })
      .catch((err) => {
        setMessage(err instanceof ApiError ? err.message : 'Could not verify this link. Please try again.');
        setStatus('error');
      });
  }, [token, applySession]);

  return (
    <div className="card p-6 text-center sm:p-8">
      {status === 'checking' && (
        <div role="status" className="flex flex-col items-center gap-3 py-4">
          <LoaderCircle className="animate-spin text-brand-600" size={32} aria-hidden />
          <p className="text-sm text-slate-600">Verifying your email…</p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center gap-3 py-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CircleCheck size={28} aria-hidden />
          </span>
          <h1 className="text-xl">Email verified</h1>
          <p className="text-sm text-slate-600">You're all set. You can now log in any time.</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-2 w-full">
            Go to dashboard
          </Button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-5 text-left">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <MailQuestion size={28} aria-hidden />
            </span>
            <h1 className="text-xl">Couldn’t verify that link</h1>
            <p className="text-sm text-slate-600">{message}</p>
          </div>
          <ResendForm />
          <p className="text-center text-sm text-slate-600">
            <Link to="/login" className="font-medium text-brand-700 underline-offset-2 hover:underline">
              Back to log in
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
