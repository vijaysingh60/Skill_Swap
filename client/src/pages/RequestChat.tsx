import { ArrowLeft, LoaderCircle, MessageCircleOff, Send, Video } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { api, ApiError, getToken, SOCKET_URL } from '../api/client';
import { Avatar } from '../components/ui/Avatar';
import { Button, LinkButton } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Field';
import { useCurrentUser } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/cn';
import type { ChatMessage } from '../types';

type RouterState = { other?: { id: string; name: string } } | null;

/** "5:08 pm" for today, otherwise "14 Nov, 5:08 pm". */
function formatMessageTime(iso: string) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return date.toLocaleString(undefined, { day: sameDay ? undefined : 'numeric', month: sameDay ? undefined : 'short', hour: 'numeric', minute: '2-digit' });
}

type Status = 'connecting' | 'ready' | 'blocked';

export default function RequestChat() {
  usePageTitle('Conversation');
  const { id = '' } = useParams();
  const me = useCurrentUser();
  const routerState = useLocation().state as RouterState;

  const [status, setStatus] = useState<Status>('connecting');
  const [blockedMessage, setBlockedMessage] = useState('');
  // Router state paints the header instantly when arriving via a link; it's replaced the moment the
  // real history load resolves, which also covers a reload or a direct visit where there is no state.
  const [other, setOther] = useState(routerState?.other ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('connecting');
    setMessages([]);

    const socket = io(SOCKET_URL, { auth: { token: getToken() }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('message:new', (message: ChatMessage) => {
      if (message.requestId === id) setMessages((current) => [...current, message]);
    });

    (async () => {
      try {
        const [history] = await Promise.all([
          api.getRequestMessages(id),
          new Promise<void>((resolve, reject) => {
            socket.on('connect', () => socket.emit('request:join', id, (ack: { ok: boolean; error?: string }) => (ack.ok ? resolve() : reject(new Error(ack.error ?? 'Could not open this conversation.')))));
            socket.on('connect_error', () => reject(new Error('Could not connect. Please try again.')));
          }),
        ]);
        if (cancelled) return;
        setOther(history.other);
        setMessages(history.messages);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setBlockedMessage(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'This conversation is not available.');
        setStatus('blocked');
      }
    })();

    return () => {
      cancelled = true;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const otherName = other?.name ?? 'your conversation';
  const otherId = other?.id;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    const socket = socketRef.current;
    if (!text || sending || !socket) return;
    setSending(true);
    socket.emit('message:send', { requestId: id, text }, (ack: { ok: boolean; error?: string }) => {
      setSending(false);
      if (ack.ok) setDraft('');
      // A failed send just leaves the draft in the box — nothing was lost, so there's nothing more to show.
    });
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-2xl flex-col lg:h-[calc(100dvh-6rem)]">
      <header className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <Link to="/requests" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden" aria-label="Back to requests">
          <ArrowLeft size={18} aria-hidden />
        </Link>
        <Avatar name={otherName} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base">{otherName}</h1>
          <p className="text-xs text-slate-500">{status === 'ready' ? 'Chat about your skill exchange' : status === 'connecting' ? 'Connecting…' : 'Unavailable'}</p>
        </div>
        {status === 'ready' && (
          <LinkButton to={`/requests/${id}/room`} state={{ other: otherId && otherName ? { id: otherId, name: otherName } : undefined }} variant="secondary" size="sm" icon={Video}>
            <span className="hidden sm:inline">Video call</span>
          </LinkButton>
        )}
      </header>

      {status === 'connecting' && (
        <div role="status" className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-600">
          <LoaderCircle className="animate-spin" size={18} aria-hidden /> Opening conversation…
        </div>
      )}

      {status === 'blocked' && (
        <div className="flex flex-1 items-center justify-center p-4">
          <EmptyState icon={MessageCircleOff} title="This conversation isn’t available" action={<LinkButton to="/requests" variant="secondary">Back to requests</LinkButton>}>
            {blockedMessage}
          </EmptyState>
        </div>
      )}

      {status === 'ready' && (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto py-4">
            {messages.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No messages yet. Say hello!</p>}
            {messages.map((m) => {
              const mine = m.senderId === me.id;
              return (
                <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2 text-sm', mine ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-slate-100 text-slate-800')}>
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <p className={cn('mt-1 text-[11px]', mine ? 'text-brand-100' : 'text-slate-500')}>{formatMessageTime(m.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 pt-3">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              maxLength={2000}
              aria-label="Message"
              className="flex-1"
            />
            <Button type="submit" icon={Send} loading={sending} disabled={!draft.trim()}>
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
