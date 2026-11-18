import { BadgeCheck, CalendarDays, Clock, IndianRupee, Users, Video, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useNow } from '../hooks/useNow';
import { cn } from '../lib/cn';
import { formatDay, formatTimeRange, hasStarted, phaseAt, timeUntil } from '../lib/time';
import type { ClassSession } from '../types';
import { PaymentDialog } from './PaymentDialog';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { Button, LinkButton } from './ui/Button';
import { ConfirmDialog } from './ui/Dialog';
import { useToast } from './ui/Toast';

interface Props {
  session: ClassSession;
  /** Called with the fresh class after joining, leaving or cancelling. */
  onChange: (session: ClassSession) => void;
}

function StatusBadges({ session, now }: { session: ClassSession; now: number }) {
  const phase = phaseAt(session, now);
  const full = session.spotsLeft === 0 && !session.joined && !session.isHost;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {phase === 'cancelled' && <Badge tone="danger">Cancelled</Badge>}
      {phase === 'ended' && <Badge>Ended</Badge>}
      {phase === 'open' && <Badge tone="success">{hasStarted(session, now) ? 'Live now' : 'Starting soon'}</Badge>}
      {session.joined && phase !== 'cancelled' && <Badge tone="brand">You’re in</Badge>}
      {session.isHost && phase !== 'cancelled' && <Badge tone="violet">You’re hosting</Badge>}
      {full && phase !== 'ended' && phase !== 'cancelled' && <Badge tone="warning">Full</Badge>}
    </div>
  );
}

export function ClassCard({ session, onChange }: Props) {
  const toast = useToast();
  const now = useNow();
  const [busy, setBusy] = useState<'join' | 'pay' | 'leave' | 'cancel' | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  const phase = phaseAt(session, now);
  const over = now > new Date(session.endsAt).getTime();
  const member = session.isHost || session.joined;
  const canEnter = member && phase === 'open';
  const full = session.spotsLeft === 0 && !session.joined;
  const joinable = !session.isHost && !session.joined && (phase === 'upcoming' || phase === 'open') && !over;
  const needsPayment = joinable && session.price > 0 && !session.paidByMe;

  const run = async (kind: 'join' | 'pay' | 'leave' | 'cancel', action: () => Promise<{ session: ClassSession }>, success: string) => {
    if (busy) return; // ignore double clicks while a request is in flight
    setBusy(kind);
    try {
      const { session: updated } = await action();
      onChange(updated);
      toast.success(success);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
      setConfirmingCancel(false);
      setConfirmingPayment(false);
    }
  };

  // The dialog's demo payment, then the regular join — one user action, two calls.
  const payThenJoin = () =>
    run('pay', async () => {
      await api.payForSession(session.id);
      return api.joinSession(session.id);
    }, `Paid ₹${session.price} and joined! ${session.title} is on your schedule.`);

  return (
    <article className={cn('card flex h-full flex-col gap-4 p-5', (phase === 'cancelled' || phase === 'ended') && 'opacity-80')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{session.skill}</Badge>
          {session.price > 0 ? (
            <Badge tone="violet" icon={IndianRupee}>
              {session.price}
            </Badge>
          ) : (
            <Badge tone="success">Free</Badge>
          )}
        </div>
        <StatusBadges session={session} now={now} />
      </div>

      <div className="min-w-0">
        <h3 className="text-base leading-snug">{session.title}</h3>
        {session.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{session.description}</p>}
      </div>

      <ul className="space-y-1.5 text-sm text-slate-700">
        <li className="flex items-center gap-2">
          <CalendarDays size={16} className="shrink-0 text-slate-500" aria-hidden />
          {formatDay(session.startsAt)}
        </li>
        <li className="flex items-center gap-2">
          <Clock size={16} className="shrink-0 text-slate-500" aria-hidden />
          {formatTimeRange(session.startsAt, session.endsAt)} · {session.durationMinutes} min
        </li>
        <li className="flex items-center gap-2">
          <Users size={16} className="shrink-0 text-slate-500" aria-hidden />
          {session.attendeeCount} of {session.capacity} joined{phase !== 'ended' && phase !== 'cancelled' && !full ? ` · ${session.spotsLeft} left` : ''}
        </li>
      </ul>

      {!session.isHost && (
        <div className="flex items-center gap-2.5 border-t border-slate-100 pt-4">
          <Avatar name={session.instructor.name} size="sm" />
          <div className="min-w-0 text-sm">
            <Link to={`/students/${session.instructor.id}`} className="font-medium text-slate-900 hover:text-brand-700">
              {session.instructor.name}
            </Link>
            <p className="flex min-w-0 items-center gap-1 text-xs text-slate-500">
              <BadgeCheck size={12} className="shrink-0 text-brand-600" aria-label="Verified instructor" />
              <span className="truncate">{session.instructor.headline || 'Verified instructor'}</span>
            </p>
          </div>
        </div>
      )}

      {session.isHost && session.attendees && (
        <details className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium text-slate-700">
            {session.attendees.length === 0 ? 'No students yet' : `${session.attendees.length} student${session.attendees.length === 1 ? '' : 's'} signed up`}
          </summary>
          {session.attendees.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {session.attendees.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <Avatar name={a.name} size="sm" />
                  <span className="min-w-0 truncate">
                    {a.name} <span className="text-xs text-slate-500">· {a.department}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </details>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {canEnter && (
          <LinkButton to={`/classes/${session.id}/room`} icon={Video} className="flex-1">
            {session.isHost ? 'Start class' : 'Join video room'}
          </LinkButton>
        )}
        {joinable && (
          <Button
            className="flex-1"
            loading={busy === 'join' || busy === 'pay'}
            disabled={full}
            onClick={() => (needsPayment ? setConfirmingPayment(true) : run('join', () => api.joinSession(session.id), `You’re in! ${session.title} is on your schedule.`))}
          >
            {full ? 'Class full' : needsPayment ? `Pay ₹${session.price} & join` : 'Join class'}
          </Button>
        )}
        {session.joined && phase === 'upcoming' && (
          <>
            <p className="w-full text-xs text-slate-500">Room opens {timeUntil(session.roomOpensAt, now)}. We’ll show a join button here.</p>
            <Button variant="secondary" size="sm" loading={busy === 'leave'} onClick={() => run('leave', () => api.leaveSession(session.id), 'You left the class.')}>
              Leave class
            </Button>
          </>
        )}
        {session.isHost && phase === 'upcoming' && <p className="w-full text-xs text-slate-500">Room opens {timeUntil(session.roomOpensAt, now)}.</p>}
        {session.isHost && (phase === 'upcoming' || phase === 'open') && !over && (
          <Button variant="danger" size="sm" icon={X} disabled={busy !== null} onClick={() => setConfirmingCancel(true)}>
            Cancel class
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmingCancel}
        title="Cancel this class?"
        description={`${session.attendeeCount > 0 ? `${session.attendeeCount} student${session.attendeeCount === 1 ? ' has' : 's have'} signed up and will see it as cancelled. ` : ''}This can’t be undone.`}
        confirmLabel="Cancel class"
        loading={busy === 'cancel'}
        onConfirm={() => run('cancel', () => api.cancelSession(session.id), 'Class cancelled.')}
        onCancel={() => setConfirmingCancel(false)}
      />

      <PaymentDialog open={confirmingPayment} classTitle={session.title} amount={session.price} loading={busy === 'pay'} onConfirm={payThenJoin} onCancel={() => setConfirmingPayment(false)} />
    </article>
  );
}
