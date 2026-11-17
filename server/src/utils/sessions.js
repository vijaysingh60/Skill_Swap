// The video room opens shortly before a class starts and closes a little after it should have ended.
export const ROOM_OPENS_MINUTES_BEFORE = 15;
export const ROOM_CLOSES_MINUTES_AFTER = 30;
export const MIN_LEAD_MINUTES = 5;
export const MAX_AHEAD_DAYS = 180;

const MIN = 60_000;

export const roomOpensAt = (session) => new Date(session.startsAt.getTime() - ROOM_OPENS_MINUTES_BEFORE * MIN);
export const roomClosesAt = (session) => new Date(session.endsAt.getTime() + ROOM_CLOSES_MINUTES_AFTER * MIN);

/** cancelled | upcoming (room not open yet) | open (join now) | ended */
export function phaseOf(session, now = new Date()) {
  if (session.status === 'cancelled') return 'cancelled';
  if (now > roomClosesAt(session)) return 'ended';
  if (now >= roomOpensAt(session)) return 'open';
  return 'upcoming';
}
