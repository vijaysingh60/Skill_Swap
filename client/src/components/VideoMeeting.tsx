import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ErrorState } from './ui/EmptyState';
import type { VideoRoom } from '../types';

// ----- Minimal typing for the Jitsi IFrame API we load at runtime -----
interface JitsiApi {
  addListener: (event: string, listener: () => void) => void;
  dispose: () => void;
}
declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

const scripts = new Map<string, Promise<void>>();
/** Loads a script once, and lets a failed load be retried. */
function loadScript(src: string): Promise<void> {
  const existing = scripts.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      scripts.delete(src);
      el.remove();
      reject(new Error('Could not load the video service.'));
    };
    document.head.appendChild(el);
  });
  scripts.set(src, promise);
  return promise;
}

/**
 * The live video call itself, embedded with the Jitsi IFrame API. Shared by both a scheduled
 * class's room (pages/ClassRoom.tsx) and a 1:1 conversation's on-demand room
 * (pages/RequestRoom.tsx) — both just hand it the room descriptor the server signed.
 */
export function Meeting({ room, onLeave }: { room: VideoRoom; onLeave: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const leaveRef = useRef(onLeave);
  leaveRef.current = onLeave;
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let api: JitsiApi | undefined;
    let cancelled = false;
    setState('loading');
    loadScript(`https://${room.domain}/${room.appId}/external_api.js`)
      .then(() => {
        const Api = window.JitsiMeetExternalAPI;
        if (cancelled || !container.current || !Api) {
          if (!cancelled && !Api) setState('error');
          return;
        }
        api = new Api(room.domain, {
          roomName: room.roomName,
          jwt: room.jwt,
          parentNode: container.current,
          width: '100%',
          height: '100%',
          userInfo: { displayName: room.displayName },
          configOverwrite: { prejoinConfig: { enabled: true }, disableDeepLinking: true },
          interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
        });
        api.addListener('readyToClose', () => leaveRef.current());
        setState('ready');
      })
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
      api?.dispose(); // hang up and release the camera and microphone
    };
  }, [room, attempt]);

  return (
    <div className="relative min-h-0 flex-1 bg-slate-900">
      <div ref={container} data-testid="meeting" className="absolute inset-0" />
      {state === 'loading' && (
        <div role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-200">
          <LoaderCircle className="animate-spin" size={20} aria-hidden /> Connecting to the video room…
        </div>
      )}
      {state === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <ErrorState message="We couldn’t load the video service. Check your connection and that nothing is blocking 8x8.vc, then try again." onRetry={() => setAttempt((a) => a + 1)} />
          </div>
        </div>
      )}
    </div>
  );
}
