import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { applicantForAdmin } from '../utils/serialize.js';
import { OBJECT_ID_RE, validateDecision } from '../utils/validate.js';

const LISTABLE = ['pending', 'verified', 'rejected'];

// Instructor applications, grouped by status, with a count for each tab.
export async function listApplications(req, res) {
  const status = LISTABLE.includes(req.query.status) ? req.query.status : 'pending';
  const [users, ...counts] = await Promise.all([
    User.find({ 'instructor.status': status })
      .sort(status === 'pending' ? { 'instructor.appliedAt': 1 } : { 'instructor.reviewedAt': -1 })
      .limit(100)
      .lean(),
    ...LISTABLE.map((s) => User.countDocuments({ 'instructor.status': s })),
  ]);
  res.json({
    status,
    applications: users.map(applicantForAdmin),
    counts: Object.fromEntries(LISTABLE.map((s, i) => [s, counts[i]])),
  });
}

// Which current states each decision is allowed to act on, and where it leads.
const TRANSITIONS = {
  approve: { from: ['pending', 'rejected'], to: 'verified' },
  reject: { from: ['pending'], to: 'rejected' },
  revoke: { from: ['verified'], to: 'rejected' },
};

export async function decide(req, res) {
  const { id } = req.params;
  const { decision, note } = validateDecision(req.body);
  if (!OBJECT_ID_RE.test(id)) throw new HttpError(404, 'Applicant not found.');
  // Verification must come from someone else.
  if (id === String(req.user._id)) throw new HttpError(403, 'You cannot review your own application.');

  const { from, to } = TRANSITIONS[decision];
  const set = { 'instructor.status': to, 'instructor.reviewedAt': new Date(), 'instructor.reviewNote': note };
  if (to !== 'verified') set.mode = 'student';

  const updated = await User.findOneAndUpdate({ _id: id, 'instructor.status': { $in: from } }, { $set: set }, { returnDocument: 'after' });
  if (!updated) {
    const exists = await User.exists({ _id: id });
    if (!exists) throw new HttpError(404, 'Applicant not found.');
    throw new HttpError(409, `That application can't be ${decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'revoked'} from its current state.`);
  }

  // A revoked instructor's upcoming classes would strand students, so cancel them.
  if (decision === 'revoke') {
    await Session.updateMany({ instructor: updated._id, status: 'scheduled', endsAt: { $gt: new Date() } }, { status: 'cancelled' });
  }
  res.json({ application: applicantForAdmin(updated) });
}
