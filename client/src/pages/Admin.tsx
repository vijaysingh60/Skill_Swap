import { BadgeCheck, Check, Inbox, ShieldCheck, X } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import { SkillList } from '../components/SkillList';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { TextAreaField } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingList } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useFetch } from '../hooks/useFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/cn';
import { focusFirstInvalid, formatDate } from '../lib/dom';
import type { Applicant } from '../types';

type Tab = 'pending' | 'verified' | 'rejected';
type Decision = 'approve' | 'reject' | 'revoke';

const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'verified', label: 'Verified' },
  { id: 'rejected', label: 'Rejected' },
];

const EMPTY: Record<Tab, { title: string; text: string }> = {
  pending: { title: 'No applications waiting', text: 'New instructor applications will show up here for review.' },
  verified: { title: 'No verified instructors yet', text: 'Approve an application and the instructor appears here.' },
  rejected: { title: 'Nothing rejected', text: 'Applications you reject or revoke are listed here.' },
};

const NOTE_COPY: Record<Exclude<Decision, 'approve'>, { title: string; label: string; confirm: string; hint: string }> = {
  reject: { title: 'Reject application', label: 'Reason for rejecting', confirm: 'Reject application', hint: 'The applicant will see this and can apply again.' },
  revoke: { title: 'Revoke verification', label: 'Reason for revoking', confirm: 'Revoke verification', hint: 'Their upcoming classes will be cancelled, and they’ll return to student mode.' },
};

export default function Admin() {
  usePageTitle('Admin');
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('pending');
  const { data, error, loading, reload } = useFetch(() => api.listApplications(tab), [tab]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noting, setNoting] = useState<{ applicant: Applicant; decision: Exclude<Decision, 'approve'> } | null>(null);

  const decide = async (applicant: Applicant, decision: Decision, note = ''): Promise<boolean> => {
    if (busyId) return false;
    setBusyId(applicant.id);
    try {
      await api.decideApplication(applicant.id, decision, note);
      toast.success(decision === 'approve' ? `${applicant.name} is now a verified instructor.` : decision === 'reject' ? `Rejected ${applicant.name}’s application.` : `Revoked ${applicant.name}’s verification.`);
      reload();
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save the decision.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const applications = data?.applications ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Instructor verification" subtitle="Review who can host live classes. Only verified instructors can schedule." />

      <div role="tablist" aria-label="Application status" className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn('flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors', tab === id ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900')}
          >
            {label}
            {data && <span className={cn('rounded-full px-2 py-0.5 text-xs', id === 'pending' && data.counts.pending > 0 ? 'bg-amber-100 text-amber-800' : 'text-slate-500')}>{data.counts[id]}</span>}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <LoadingList label="Loading applications…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : applications.length === 0 ? (
        <EmptyState icon={tab === 'pending' ? Inbox : ShieldCheck} title={EMPTY[tab].title}>
          {EMPTY[tab].text}
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {applications.map((a) => (
            <li key={a.id}>
              <article className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={a.name} />
                    <div className="min-w-0">
                      <h2 className="truncate text-base">{a.name}</h2>
                      <p className="truncate text-xs text-slate-500">
                        {a.department} ·{' '}
                        <a href={`mailto:${a.email}`} className="hover:text-brand-700 hover:underline">
                          {a.email}
                        </a>
                      </p>
                    </div>
                  </div>
                  {a.status === 'verified' && (
                    <Badge tone="brand" icon={BadgeCheck}>
                      Verified
                    </Badge>
                  )}
                  {a.status === 'rejected' && <Badge tone="danger">Rejected</Badge>}
                  {a.status === 'pending' && <Badge tone="warning">Pending</Badge>}
                </div>

                <p className="mt-4 font-medium text-slate-900">{a.headline}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{a.experience}</p>
                <div className="mt-4">
                  <SkillList title="Skills they can teach" skills={a.skillsOffered} tone="offered" emptyText="No skills listed." max={8} />
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  {a.appliedAt && <>Applied {formatDate(a.appliedAt)}</>}
                  {a.reviewedAt && <> · Reviewed {formatDate(a.reviewedAt)}</>}
                </p>
                {a.reviewNote && a.status !== 'pending' && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">Note: {a.reviewNote}</p>}

                <div className="mt-4 flex flex-wrap gap-2">
                  {a.status !== 'verified' && (
                    <Button size="sm" icon={Check} loading={busyId === a.id} disabled={busyId !== null && busyId !== a.id} onClick={() => decide(a, 'approve')}>
                      Approve
                    </Button>
                  )}
                  {a.status === 'pending' && (
                    <Button size="sm" variant="danger" icon={X} disabled={busyId !== null} onClick={() => setNoting({ applicant: a, decision: 'reject' })}>
                      Reject
                    </Button>
                  )}
                  {a.status === 'verified' && (
                    <Button size="sm" variant="danger" icon={X} disabled={busyId !== null} onClick={() => setNoting({ applicant: a, decision: 'revoke' })}>
                      Revoke verification
                    </Button>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <NoteDialog
        key={noting ? `${noting.applicant.id}-${noting.decision}` : 'closed'}
        state={noting}
        busy={busyId !== null}
        onCancel={() => setNoting(null)}
        onConfirm={async (note) => {
          if (noting && (await decide(noting.applicant, noting.decision, note))) setNoting(null);
        }}
      />
    </div>
  );
}

/** Asks for the reason behind a rejection or revocation; the applicant gets to read it. */
function NoteDialog({ state, busy, onCancel, onConfirm }: { state: { applicant: Applicant; decision: Exclude<Decision, 'approve'> } | null; busy: boolean; onCancel: () => void; onConfirm: (note: string) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const copy = state ? NOTE_COPY[state.decision] : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const trimmed = note.trim();
    if (trimmed.length < 5) {
      setError('Add a short reason (at least 5 characters).');
      return focusFirstInvalid(formRef.current);
    }
    setError(null);
    onConfirm(trimmed);
  };

  return (
    <Dialog
      open={state !== null}
      onClose={() => !busy && onCancel()}
      title={copy ? `${copy.title}: ${state!.applicant.name}` : ''}
      description={copy?.hint}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="decision-form" variant="destructive" loading={busy}>
            {copy?.confirm}
          </Button>
        </>
      }
    >
      <form id="decision-form" ref={formRef} onSubmit={submit} noValidate>
        <TextAreaField id="decision-note" label={copy?.label ?? ''} rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} error={error ?? undefined} hint={`${note.length}/300`} />
      </form>
    </Dialog>
  );
}
