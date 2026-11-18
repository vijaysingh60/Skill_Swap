import crypto from 'node:crypto';
import { ExchangeRequest } from '../models/ExchangeRequest.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { getJaasConfig, signRoomToken } from '../utils/jaas.js';
import { exchangeRequest } from '../utils/serialize.js';
import { findSkill } from '../utils/skills.js';
import { OBJECT_ID_RE, validateNewRequest, validateRespond } from '../utils/validate.js';

const PARTY_FIELDS = 'name email university department';

export async function createRequest(req, res) {
  const { recipientId, skillWanted, skillOffered, message } = validateNewRequest(req.body);

  if (recipientId === String(req.user._id)) {
    throw new HttpError(400, 'You cannot send an exchange request to yourself.');
  }
  const recipient = await User.findById(recipientId);
  if (!recipient) throw new HttpError(404, 'Student not found.');

  // Use the skill names exactly as stored on each profile, and make sure both sides really have them.
  const wanted = findSkill(recipient.skillsOffered, skillWanted);
  if (!wanted) {
    throw new HttpError(400, 'Please fix the highlighted fields.', { skillWanted: `${recipient.name} doesn't teach "${skillWanted}".` });
  }
  // Offering a skill back is optional (a one-directional "please teach me" ask is fine), but if one
  // is given it must be something the requester actually teaches, same as before.
  let offeredName = '';
  if (skillOffered) {
    const offered = findSkill(req.user.skillsOffered, skillOffered);
    if (!offered) {
      throw new HttpError(400, 'Please fix the highlighted fields.', { skillOffered: `Add "${skillOffered}" to the skills you can teach first.` });
    }
    offeredName = offered.name;
  }

  const duplicate = { requester: req.user._id, recipient: recipient._id, skillWanted: wanted.name, skillOffered: offeredName, status: 'pending' };
  if (await ExchangeRequest.exists(duplicate)) {
    throw new HttpError(409, 'You already have a pending request to this student for the same skills.');
  }

  let doc;
  try {
    doc = await ExchangeRequest.create({ ...duplicate, message });
  } catch (err) {
    if (err.code === 11000) throw new HttpError(409, 'You already have a pending request to this student for the same skills.');
    throw err;
  }
  await doc.populate([
    { path: 'requester', select: PARTY_FIELDS },
    { path: 'recipient', select: PARTY_FIELDS },
  ]);
  res.status(201).json({ request: exchangeRequest(doc) });
}

// All requests the current user sent or received, newest first.
export async function listRequests(req, res) {
  const docs = await ExchangeRequest.find({ $or: [{ requester: req.user._id }, { recipient: req.user._id }] })
    .sort({ createdAt: -1 })
    .populate('requester', PARTY_FIELDS)
    .populate('recipient', PARTY_FIELDS);

  const requests = docs.filter((d) => d.requester && d.recipient).map(exchangeRequest);
  res.json({
    incoming: requests.filter((r) => r.recipient.id === String(req.user._id)),
    outgoing: requests.filter((r) => r.requester.id === String(req.user._id)),
  });
}

// Only the recipient can accept or reject, and only while the request is pending.
export async function respondToRequest(req, res) {
  const { id } = req.params;
  const { status } = validateRespond(req.body);
  if (!OBJECT_ID_RE.test(id)) throw new HttpError(404, 'Request not found.');

  // Accepting opens up chat and an on-demand video call between the two students — see
  // getRequestMessages/getRequestRoom below — so this is also where the room is created.
  const set = status === 'accepted' ? { status, roomId: `request-${crypto.randomBytes(12).toString('hex')}` } : { status };

  const updated = await ExchangeRequest.findOneAndUpdate({ _id: id, recipient: req.user._id, status: 'pending' }, set, { returnDocument: 'after' })
    .populate('requester', PARTY_FIELDS)
    .populate('recipient', PARTY_FIELDS);

  if (!updated) {
    const existing = await ExchangeRequest.findById(id);
    const isParty = existing && [existing.requester, existing.recipient].some((u) => u.equals(req.user._id));
    if (!isParty) throw new HttpError(404, 'Request not found.');
    if (!existing.recipient.equals(req.user._id)) throw new HttpError(403, 'Only the student who received a request can respond to it.');
    throw new HttpError(409, `This request was already ${existing.status}.`);
  }
  res.json({ request: exchangeRequest(updated) });
}

/** The accepted request `id`, if `userId` is one of its two participants. Otherwise null. */
async function loadAcceptedRequestFor(id, userId) {
  if (!OBJECT_ID_RE.test(id)) return null;
  const doc = await ExchangeRequest.findOne({ _id: id, status: 'accepted', $or: [{ requester: userId }, { recipient: userId }] });
  return doc;
}

// Chat history for an accepted request. New messages arrive over Socket.IO (see realtime.js);
// this just loads what was said before the page opened.
export async function getRequestMessages(req, res) {
  const request = await loadAcceptedRequestFor(req.params.id, req.user._id);
  if (!request) throw new HttpError(404, 'This conversation is not available. Only the two students in an accepted request can see it.');
  await request.populate([
    { path: 'requester', select: 'name' },
    { path: 'recipient', select: 'name' },
  ]);

  const docs = await Message.find({ request: request._id }).sort({ createdAt: 1 }).limit(500).populate('sender', 'name');
  res.json({
    // Who's on the other end, so the chat header has a name even before any message exists or on a
    // fresh page load (a reload, or opening the link directly) — not just from router navigation state.
    other: req.user._id.equals(request.requester._id) ? { id: String(request.recipient._id), name: request.recipient.name } : { id: String(request.requester._id), name: request.requester.name },
    messages: docs.map((m) => ({ id: String(m._id), requestId: String(request._id), senderId: String(m.sender._id), senderName: m.sender.name, text: m.text, createdAt: m.createdAt })),
  });
}

/**
 * An on-demand video call between the two students of an accepted request, reusing the same JaaS
 * signing used for scheduled classes (utils/jaas.js) — neither side is a "host", so both get
 * moderator rights, and (unlike a class) there's no time window: it's open for as long as the
 * request stays accepted, which per the current rules is forever once accepted.
 */
export async function getRequestRoom(req, res) {
  const request = await loadAcceptedRequestFor(req.params.id, req.user._id);
  if (!request) throw new HttpError(404, 'This video room is not available. Only the two students in an accepted request can join it.');

  const jaas = getJaasConfig();
  if (!jaas) throw new HttpError(503, 'Video calls are not set up on this server yet. An administrator needs to add the JaaS keys.');

  const expiresAt = new Date(Date.now() + 6 * 3_600_000);
  res.json({
    room: {
      provider: 'jaas',
      domain: '8x8.vc',
      appId: jaas.appId,
      roomName: `${jaas.appId}/${request.roomId}`,
      jwt: signRoomToken({ user: req.user, roomId: request.roomId, moderator: true, expiresAt }),
      displayName: req.user.name,
      moderator: true,
      title: 'Your conversation',
      closesAt: expiresAt,
    },
  });
}
