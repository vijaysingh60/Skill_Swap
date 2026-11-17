import { ExchangeRequest } from '../models/ExchangeRequest.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
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
  const offered = findSkill(req.user.skillsOffered, skillOffered);
  if (!offered) {
    throw new HttpError(400, 'Please fix the highlighted fields.', { skillOffered: `Add "${skillOffered}" to the skills you can teach first.` });
  }

  const duplicate = { requester: req.user._id, recipient: recipient._id, skillWanted: wanted.name, skillOffered: offered.name, status: 'pending' };
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

  const updated = await ExchangeRequest.findOneAndUpdate(
    { _id: id, recipient: req.user._id, status: 'pending' },
    { status },
    { returnDocument: 'after' },
  )
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
