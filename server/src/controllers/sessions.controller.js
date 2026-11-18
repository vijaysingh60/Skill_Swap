import crypto from 'node:crypto';
import { Payment } from '../models/Payment.js';
import { Session } from '../models/Session.js';
import { HttpError } from '../utils/httpError.js';
import { getJaasConfig, signRoomToken } from '../utils/jaas.js';
import { sessionDto } from '../utils/serialize.js';
import { MAX_AHEAD_DAYS, MIN_LEAD_MINUTES, phaseOf, roomClosesAt, roomOpensAt } from '../utils/sessions.js';
import { escapeRegex, findSkill } from '../utils/skills.js';
import { OBJECT_ID_RE, validateNewSession } from '../utils/validate.js';

const HOST_FIELDS = 'name department instructor.headline';
const MAX_UPCOMING_PER_INSTRUCTOR = 30;
const DAY = 86_400_000;

const clampInt = (value, fallback, min, max) => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
};

const withHost = (query) => query.populate('instructor', HOST_FIELDS);

async function loadSession(id) {
  if (!OBJECT_ID_RE.test(id)) return null;
  return withHost(Session.findById(id));
}

/**
 * browse  - classes other people are hosting that haven't finished yet
 * joined  - classes I signed up for (recent past ones included)
 * hosting - classes I host (verified instructors only)
 */
export async function listSessions(req, res) {
  const view = ['browse', 'joined', 'hosting'].includes(req.query.view) ? req.query.view : 'browse';
  const limit = clampInt(req.query.limit, 50, 1, 100);
  const me = req.user._id;
  const now = new Date();

  let filter;
  if (view === 'browse') filter = { status: 'scheduled', endsAt: { $gt: now }, instructor: { $ne: me } };
  else if (view === 'joined') filter = { attendees: me, endsAt: { $gt: new Date(now.getTime() - 7 * DAY) } };
  else {
    if (req.user.instructor?.status !== 'verified') throw new HttpError(403, 'Only verified instructors host classes.');
    filter = { instructor: me, endsAt: { $gt: new Date(now.getTime() - 30 * DAY) } };
  }

  const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 50) : '';
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: pattern }, { skill: pattern }];
  }
  // Used by an instructor's public profile to show their upcoming classes.
  if (view === 'browse' && typeof req.query.instructor === 'string' && OBJECT_ID_RE.test(req.query.instructor)) {
    filter.instructor = req.query.instructor === String(me) ? { $in: [] } : req.query.instructor;
  }

  let query = withHost(Session.find(filter).sort({ startsAt: 1 }).limit(limit));
  if (view === 'hosting') query = query.populate('attendees', 'name department');
  const sessions = await query;

  // One query for every paid class in the page, instead of one per session.
  const pricedIds = sessions.filter((s) => s.price > 0).map((s) => s._id);
  const paidSessionIds = pricedIds.length === 0 ? new Set() : new Set((await Payment.find({ student: me, session: { $in: pricedIds } }).distinct('session')).map(String));

  res.json({ sessions: sessions.map((s) => sessionDto(s, me, paidSessionIds)) });
}

export async function getSession(req, res) {
  const session = await loadSession(req.params.id);
  if (!session) throw new HttpError(404, 'Class not found.');
  if (session.instructor._id.equals(req.user._id)) await session.populate('attendees', 'name department');
  const paid = session.price > 0 && Boolean(await Payment.exists({ student: req.user._id, session: session._id }));
  res.json({ session: sessionDto(session, req.user._id, paid) });
}

export async function createSession(req, res) {
  const data = validateNewSession(req.body, new Date(), { minLeadMinutes: MIN_LEAD_MINUTES, maxAheadDays: MAX_AHEAD_DAYS });
  const me = req.user._id;

  // A class can only teach a skill the instructor has actually listed on their own profile,
  // not anything typed into the form. Use the exact spelling/casing from their profile.
  const ownSkill = findSkill(req.user.skillsOffered, data.skill);
  if (!ownSkill) {
    throw new HttpError(400, 'Please fix the highlighted fields.', { skill: 'Choose a skill from your own profile. Add it on My Skills first if it’s missing.' });
  }
  data.skill = ownSkill.name;

  const endsAt = new Date(data.startsAt.getTime() + data.durationMinutes * 60_000);

  const clash = await Session.exists({ instructor: me, status: 'scheduled', startsAt: { $lt: endsAt }, endsAt: { $gt: data.startsAt } });
  if (clash) throw new HttpError(409, 'Please fix the highlighted fields.', { startsAt: 'You already have a class scheduled at this time.' });

  const upcoming = await Session.countDocuments({ instructor: me, status: 'scheduled', endsAt: { $gt: new Date() } });
  if (upcoming >= MAX_UPCOMING_PER_INSTRUCTOR) throw new HttpError(409, `You can have at most ${MAX_UPCOMING_PER_INSTRUCTOR} upcoming classes. Cancel or finish some first.`);

  const session = await Session.create({ ...data, endsAt, instructor: me, roomId: `skillswap-${crypto.randomBytes(12).toString('hex')}` });
  await session.populate('instructor', HOST_FIELDS);
  res.status(201).json({ session: sessionDto(session, me) });
}

// Sign up for a class. One conditional update enforces every rule at once, so the last seat can't be double-booked.
export async function joinSession(req, res) {
  const { id } = req.params;
  const me = req.user._id;
  if (!OBJECT_ID_RE.test(id)) throw new HttpError(404, 'Class not found.');

  // Paid classes must be paid for first — POST /sessions/:id/pay, then join. Checked here rather
  // than folded into the atomic update below because it needs a clear, specific error (402, with
  // the price) rather than a generic "can't join", and it never races the capacity check: paying
  // doesn't reserve a seat, it only unlocks the right to try to join one.
  const price = await Session.findById(id).select('price');
  if (price?.price > 0 && !(await Payment.exists({ student: me, session: id }))) {
    throw new HttpError(402, 'Please pay to join this class.', undefined, { price: price.price });
  }

  const updated = await withHost(
    Session.findOneAndUpdate(
      {
        _id: id,
        status: 'scheduled',
        endsAt: { $gt: new Date() },
        instructor: { $ne: me },
        attendees: { $ne: me },
        $expr: { $lt: [{ $size: '$attendees' }, '$capacity'] },
      },
      { $addToSet: { attendees: me } },
      { returnDocument: 'after' },
    ),
  );
  if (updated) return res.json({ session: sessionDto(updated, me, updated.price > 0) });

  const session = await Session.findById(id);
  if (!session) throw new HttpError(404, 'Class not found.');
  if (session.instructor.equals(me)) throw new HttpError(400, 'You are hosting this class, so you are already in it.');
  if (session.status === 'cancelled') throw new HttpError(409, 'This class was cancelled.');
  if (session.endsAt <= new Date()) throw new HttpError(409, 'This class has already ended.');
  if (session.attendees.some((a) => a.equals(me))) throw new HttpError(409, 'You have already joined this class.');
  throw new HttpError(409, 'This class is full.');
}

/**
 * MOCK payment: records a receipt instantly, with no real gateway or money involved (see
 * models/Payment.js). Paying doesn't join the class by itself — call POST /sessions/:id/join next.
 */
export async function payForSession(req, res) {
  const { id } = req.params;
  const me = req.user._id;
  if (!OBJECT_ID_RE.test(id)) throw new HttpError(404, 'Class not found.');

  const session = await Session.findById(id);
  if (!session) throw new HttpError(404, 'Class not found.');
  if (session.instructor.equals(me)) throw new HttpError(400, 'You are hosting this class, so there is nothing to pay.');
  if (session.price <= 0) throw new HttpError(400, 'This class is free — no payment needed.');
  if (session.status === 'cancelled') throw new HttpError(409, 'This class was cancelled.');
  if (session.endsAt <= new Date()) throw new HttpError(409, 'This class has already ended.');

  // Idempotent: paying twice for the same class returns the original receipt, never a double charge.
  let payment = await Payment.findOne({ student: me, session: id });
  if (!payment) {
    try {
      payment = await Payment.create({ student: me, session: id, amount: session.price });
    } catch (err) {
      if (err.code === 11000) payment = await Payment.findOne({ student: me, session: id }); // lost a race with a duplicate click
      else throw err;
    }
  }
  res.status(201).json({ payment: { id: String(payment._id), amount: payment.amount, provider: payment.provider, createdAt: payment.createdAt } });
}

export async function leaveSession(req, res) {
  const { id } = req.params;
  const me = req.user._id;
  if (!OBJECT_ID_RE.test(id)) throw new HttpError(404, 'Class not found.');

  const updated = await withHost(Session.findOneAndUpdate({ _id: id, attendees: me, endsAt: { $gt: new Date() } }, { $pull: { attendees: me } }, { returnDocument: 'after' }));
  // Leaving never refunds (it's a receipt, not a reservation — see models/Payment.js), so someone
  // who paid and rejoins later isn't charged again.
  if (updated) return res.json({ session: sessionDto(updated, me, updated.price > 0) });

  const session = await Session.findById(id);
  if (!session) throw new HttpError(404, 'Class not found.');
  if (!session.attendees.some((a) => a.equals(me))) throw new HttpError(409, "You haven't joined this class.");
  throw new HttpError(409, 'This class has already ended.');
}

// Cancelling keeps the record (so students see it was cancelled) and frees nobody's data.
export async function cancelSession(req, res) {
  const { id } = req.params;
  const me = req.user._id;
  if (!OBJECT_ID_RE.test(id)) throw new HttpError(404, 'Class not found.');

  const updated = await withHost(Session.findOneAndUpdate({ _id: id, instructor: me, status: 'scheduled', endsAt: { $gt: new Date() } }, { status: 'cancelled' }, { returnDocument: 'after' }));
  if (updated) return res.json({ session: sessionDto(updated, me) });

  const session = await Session.findById(id);
  if (!session) throw new HttpError(404, 'Class not found.');
  if (!session.instructor.equals(me)) throw new HttpError(403, 'Only the host can cancel a class.');
  throw new HttpError(409, session.status === 'cancelled' ? 'This class is already cancelled.' : 'This class has already ended.');
}

/**
 * Everything the browser needs to open the video room. Only the host and students who joined get a
 * token, and only while the room is open. The host is the only moderator.
 */
export async function getRoom(req, res) {
  const session = await loadSession(req.params.id);
  if (!session) throw new HttpError(404, 'Class not found.');

  const me = req.user;
  const isHost = session.instructor._id.equals(me._id);
  const isAttendee = session.attendees.some((a) => a.equals(me._id));
  if (!isHost && !isAttendee) throw new HttpError(403, 'Join this class first to enter its video room.');
  if (isHost && me.instructor?.status !== 'verified') throw new HttpError(403, 'Your instructor verification is no longer active.');

  const phase = phaseOf(session);
  if (phase === 'cancelled') throw new HttpError(409, 'This class was cancelled.');
  if (phase === 'ended') throw new HttpError(409, 'This class has ended.');
  if (phase === 'upcoming') throw new HttpError(409, 'The room is not open yet.', undefined, { opensAt: roomOpensAt(session) });

  const jaas = getJaasConfig();
  if (!jaas) throw new HttpError(503, 'Video calls are not set up on this server yet. An administrator needs to add the JaaS keys.');

  const closesAt = roomClosesAt(session);
  const expiresAt = new Date(Math.min(closesAt.getTime(), Date.now() + 6 * 3_600_000));
  res.json({
    room: {
      provider: 'jaas',
      domain: '8x8.vc',
      appId: jaas.appId,
      roomName: `${jaas.appId}/${session.roomId}`,
      jwt: signRoomToken({ user: me, roomId: session.roomId, moderator: isHost, expiresAt }),
      displayName: me.name,
      moderator: isHost,
      title: session.title,
      closesAt,
    },
  });
}
