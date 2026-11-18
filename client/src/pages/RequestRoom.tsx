import { ArrowLeft, LoaderCircle, Video } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { Meeting } from '../components/VideoMeeting';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { usePageTitle } from '../hooks/usePageTitle';
import type { VideoRoom } from '../types';

type Phase = { kind: 'loading' } | { kind: 'ready'; room: VideoRoom } | { kind: 'blocked'; message: string; retryable: boolean } | { kind: 'failed'; message: string };

/**
 * The on-demand video call for one accepted exchange request — the 1:1 counterpart to a scheduled
 * class's room (pages/ClassRoom.tsx). Simpler: there's no "not open yet" countdown (it's open
 * immediately once accepted) and no host/student split (both participants are equal moderators).
 */
export default function RequestRoom() {
  usePageTitle('Video call');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const otherName = (useLocation().state as { other?: { name: string } } | null)?.other?.name;
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    try {
      const { room } = await api.getRequestRoom(id);
      setPhase({ kind: 'ready', room });
    } catch (err) {
      if (!(err instanceof ApiError)) return setPhase({ kind: 'failed', message: 'Something went wrong. Check your connection and try again.' });
      if ([401, 403, 404, 503].includes(err.status)) return setPhase({ kind: 'blocked', message: err.message, retryable: err.status === 503 });
      setPhase({ kind: 'failed', message: err.message });
    }
  }, [id]);

  useEffect(() => {
    setPhase({ kind: 'loading' });
    void load();
  }, [load, attempt]);

  const backTo = `/requests/${id}/chat`;
  const leave = useCallback(() => navigate(backTo), [navigate, backTo]);

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <Link to={backTo} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
          <ArrowLeft size={16} aria-hidden /> <span className="hidden sm:inline">Back to conversation</span>
          <span className="sm:hidden">Back</span>
        </Link>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{otherName ? `Call with ${otherName}` : 'Video call'}</p>
        {phase.kind === 'ready' && (
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
            {phase.kind === 'blocked' && (
              <div className="space-y-4">
                <EmptyState icon={Video} title="You can’t join this call" action={<Link to={backTo} className="font-medium text-brand-700 underline-offset-2 hover:underline">Back to conversation</Link>}>
                  {phase.message}
                </EmptyState>
                {phase.retryable && (
                  <Alert variant="info">
                    If you run this app, add the JaaS keys to <code>server/.env</code> (see the README) and restart the server.
                  </Alert>
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
