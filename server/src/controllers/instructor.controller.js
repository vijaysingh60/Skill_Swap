import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { isVerifiedInstructor, privateUser } from '../utils/serialize.js';
import { validateInstructorApplication, validateMode } from '../utils/validate.js';

// A student asks to become an instructor. An admin has to approve before they can host anything.
export async function apply(req, res) {
  const { headline, experience } = validateInstructorApplication(req.body);
  const current = req.user.instructor?.status ?? 'none';

  if (current === 'verified') throw new HttpError(409, 'You are already a verified instructor.');
  if (current === 'pending') throw new HttpError(409, 'Your application is already under review.');
  if (req.user.skillsOffered.length === 0) {
    throw new HttpError(400, 'Add at least one skill you can teach before applying.', { headline: 'Add a skill you can teach on My Skills first.' });
  }

  // Conditional update so two quick submissions can't both go through.
  const updated = await User.findOneAndUpdate(
    { _id: req.user._id, 'instructor.status': { $nin: ['pending', 'verified'] } },
    { $set: { 'instructor.status': 'pending', 'instructor.headline': headline, 'instructor.experience': experience, 'instructor.appliedAt': new Date(), 'instructor.reviewNote': '' }, $unset: { 'instructor.reviewedAt': '' } },
    { returnDocument: 'after' },
  );
  if (!updated) throw new HttpError(409, 'Your application can no longer be changed.');
  res.json({ user: privateUser(updated) });
}

// Verified instructors can switch between teaching and learning views.
export async function setMode(req, res) {
  const { mode } = validateMode(req.body);
  if (mode === 'instructor' && !isVerifiedInstructor(req.user)) {
    throw new HttpError(403, 'Only verified instructors can switch to instructor mode.');
  }
  req.user.mode = mode;
  await req.user.save();
  res.json({ user: privateUser(req.user) });
}
