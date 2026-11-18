import { ArrowLeft, Clock, LoaderCircle, Video } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { Meeting } from '../components/VideoMeeting';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button, LinkButton } from '../components/ui/Button';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { useNow } from '../hooks/useNow';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatDay, formatTime, timeUntil } from '../lib/time';
import type { VideoRoom } from '../types';

type Phase =
  | { kind: 'loading' }
  | { kind: 'ready'; room: VideoRoom }
  | { kind: 'waiting'; opensAt: string }
  | { kind: 'blocked'; message: string; retryable: boolean }
  | { kind: 'failed'; message: string };

export default function ClassRoom() {
  usePageTitle('Live class');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const now = useNow(5_000);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    try {
      const { room } = await api.getRoom(id);
      setPhase({ kind: 'ready', room });
    } catch (err) {
      if (!(err instanceof ApiError)) return setPhase({ kind: 'failed', message: 'Something went wrong. Check your connection and try again.' });
      if (err.status === 409 && typeof err.data.opensAt === 'string') return setPhase({ kind: 'waiting', opensAt: err.data.opensAt });
      if ([401, 403, 404, 409, 503].includes(err.status)) return setPhase({ kind: 'blocked', message: err.message, retryable: err.status === 503 });
      setPhase({ kind: 'failed', message: err.message });
    }
  }, [id]);

  useEffect(() => {
    setPhase({ kind: 'loading' });
    void load();
  }, [load, attempt]);

  // Waiting for the room to open: try again automatically the moment it does.
  const opensAt = phase.kind === 'waiting' ? new Date(phase.opensAt).getTime() : null;
  useEffect(() => {
    if (opensAt !== null && now >= opensAt) setAttempt((a) => a + 1);
  }, [opensAt, now]);

  const room = phase.kind === 'ready' ? phase.room : null;
  const backTo = room?.moderator ? '/teaching' : '/classes';
  const leave = useCallback(() => navigate(backTo), [navigate, backTo]);

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <Link to={backTo} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
          <ArrowLeft size={16} aria-hidden /> <span className="hidden sm:inline">Back to classes</span>
          <span className="sm:hidden">Back</span>
        </Link>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{room?.title ?? 'Live class'}</p>
        {room && <Badge tone={room.moderator ? 'violet' : 'brand'}>{room.moderator ? 'Host' : 'Student'}</Badge>}
        {room && (
          <Button variant="secondary" size="sm" onClick={leave}>
            Leave
          </Button>
        )}
      </header>

      {phase.kind === 'ready' && <Meeting room={phase.room} onLeave={leave} />}

      {phase.kind !== 'ready' && (
        <main className="flex flex-1 items-center justify-center overflow-y-auto p-4">
          <div className="w-full max-w-md">
            {phase.kind === 'loading' && (
              <div role="status" className="flex items-center justify-center gap-2 text-sm text-slate-600">
                <LoaderCircle className="animate-spin" size={20} aria-hidden /> Checking the room…
              </div>
            )}
            {phase.kind === 'waiting' && (
              <EmptyState icon={Clock} title="The room isn’t open yet" action={<LinkButton to="/classes" variant="secondary">Back to classes</LinkButton>}>
                <p>
                  It opens {formatDay(phase.opensAt)} at {formatTime(phase.opensAt)}, <strong className="text-slate-900">{timeUntil(phase.opensAt, now)}</strong>.
                </p>
                <p className="mt-2">Keep this page open and you’ll be let in automatically.</p>
              </EmptyState>
            )}
            {phase.kind === 'blocked' && (
              <div className="space-y-4">
                <EmptyState icon={Video} title="You can’t join this room" action={<LinkButton to="/classes">Back to classes</LinkButton>}>
                  {phase.message}
                </EmptyState>
                {phase.retryable && (
                  <Alert variant="info">If you run this app, add the JaaS keys to <code>server/.env</code> (see the README) and restart the server.</Alert>
                )}
              </div>
            )}
            {phase.kind === 'failed' && <ErrorState message={phase.message} onRetry={() => setAttempt((a) => a + 1)} />}
          </div>
        </main>
      )}
    </div>
  );
}
