import type { ClassSession, SessionPhase } from '../types';

// Must match the server (server/src/utils/sessions.js): the room opens 15 minutes before the start
// and closes 30 minutes after the scheduled end.
const OPENS_BEFORE_MIN = 15;
const CLOSES_AFTER_MIN = 30;
const MIN = 60_000;

/** The phase of a class right now. Recomputed on the client so buttons update without a reload. */
export function phaseAt(session: Pick<ClassSession, 'status' | 'startsAt' | 'endsAt'>, now: number): SessionPhase {
  if (session.status === 'cancelled') return 'cancelled';
  if (now > new Date(session.endsAt).getTime() + CLOSES_AFTER_MIN * MIN) return 'ended';
  if (now >= new Date(session.startsAt).getTime() - OPENS_BEFORE_MIN * MIN) return 'open';
  return 'upcoming';
}

export const hasStarted = (session: Pick<ClassSession, 'startsAt'>, now: number) => now >= new Date(session.startsAt).getTime();

const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const timeWithZone = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

export const formatDay = (iso: string) => dayFormat.format(new Date(iso));
export const formatTime = (iso: string) => timeFormat.format(new Date(iso));
/** "5:00 pm – 6:00 pm IST", always in the viewer's own time zone. */
export const formatTimeRange = (startIso: string, endIso: string) => `${timeFormat.format(new Date(startIso))} – ${timeWithZone.format(new Date(endIso))}`;

/** "in 10 min", "in 3 hours", "in 2 days", "5 min ago". */
export function timeUntil(iso: string, now: number): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const unit =
    abs < 60 * MIN ? `${Math.max(1, Math.round(abs / MIN))} min` : abs < 48 * 60 * MIN ? `${Math.round(abs / (60 * MIN))} h` : `${Math.round(abs / (24 * 60 * MIN))} days`;
  return diff >= 0 ? `in ${unit}` : `${unit} ago`;
}

/** A Date as the "YYYY-MM-DDTHH:mm" string a datetime-local input expects, in local time. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
