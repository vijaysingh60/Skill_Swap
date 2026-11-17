import { ArrowLeftRight, Check, Mail, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { firstName, formatDate } from '../lib/dom';
import type { ExchangeRequest, RequestStatus } from '../types';
import { Alert } from './ui/Alert';
import { Avatar } from './ui/Avatar';
import { Badge, type BadgeTone } from './ui/Badge';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/Dialog';
import { useToast } from './ui/Toast';

const STATUS: Record<RequestStatus, { tone: BadgeTone; label: string }> = {
  pending: { tone: 'warning', label: 'Pending' },
  accepted: { tone: 'success', label: 'Accepted' },
  rejected: { tone: 'danger', label: 'Rejected' },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { tone, label } = STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

interface Props {
  request: ExchangeRequest;
  direction: 'incoming' | 'outgoing';
  onUpdated: (request: ExchangeRequest) => void;
}

export function RequestCard({ request, direction, onUpdated }: Props) {
  const toast = useToast();
  const [busy, setBusy] = useState<'accepted' | 'rejected' | null>(null);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incoming = direction === 'incoming';
  const other = incoming ? request.requester : request.recipient;
  const first = firstName(other.name);

  const respond = async (status: 'accepted' | 'rejected') => {
    if (busy) return; // ignore double clicks while a request is in flight
    setBusy(status);
    setError(null);
    try {
      const { request: updated } = await api.respondToRequest(request.id, status);
      onUpdated(updated);
      toast.success(status === 'accepted' ? `Accepted. You can now contact ${first}.` : `Request from ${first} rejected.`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not update the request.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(null);
      setConfirmingReject(false);
    }
  };

  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={other.name} />
          <div className="min-w-0">
            <h3 className="truncate text-base">
              <Link to={`/students/${other.id}`} className="rounded-sm hover:text-brand-700">
                {other.name}
              </Link>
            </h3>
            <p className="truncate text-xs text-slate-500">
              {other.department} · <time dateTime={request.createdAt}>{formatDate(request.createdAt)}</time>
            </p>
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <dl className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">{incoming ? `${first} wants to learn` : 'You want to learn'}</dt>
          <dd className="truncate font-medium text-slate-900">{request.skillWanted}</dd>
        </div>
        <ArrowLeftRight size={16} className="text-brand-600" aria-hidden />
        <div className="min-w-0">
          <dt className="text-xs text-slate-500">{incoming ? 'and offers' : 'and offer'}</dt>
          <dd className="truncate font-medium text-slate-900">{request.skillOffered}</dd>
        </div>
      </dl>

      {request.message && <blockquote className="mt-3 border-l-2 border-brand-200 pl-3 text-sm text-slate-600">“{request.message}”</blockquote>}

      {request.status === 'accepted' && other.email && (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          <Mail size={16} aria-hidden />
          <span>Get in touch to plan your swap:</span>
          <a href={`mailto:${other.email}`} className="break-all font-medium underline underline-offset-2">
            {other.email}
          </a>
        </p>
      )}

      {request.status === 'pending' && !incoming && <p className="mt-4 text-xs text-slate-500">Waiting for {first} to respond.</p>}

      {incoming && request.status === 'pending' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" icon={Check} loading={busy === 'accepted'} disabled={busy !== null} onClick={() => respond('accepted')}>
            Accept
          </Button>
          <Button size="sm" variant="danger" icon={X} disabled={busy !== null} onClick={() => setConfirmingReject(true)}>
            Reject
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <ConfirmDialog
        open={confirmingReject}
        title={`Reject ${first}'s request?`}
        description={`${first} will see the request as rejected. This can't be undone, but they can send a new request later.`}
        confirmLabel="Reject request"
        loading={busy === 'rejected'}
        onConfirm={() => respond('rejected')}
        onCancel={() => setConfirmingReject(false)}
      />
    </article>
  );
}
