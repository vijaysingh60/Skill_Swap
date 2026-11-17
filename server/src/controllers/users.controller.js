import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { byMatchThenName, computeMatch, recommend } from '../utils/matching.js';
import { privateUser, publicUser } from '../utils/serialize.js';
import { escapeRegex } from '../utils/skills.js';
import { OBJECT_ID_RE, validateProfile } from '../utils/validate.js';

const clampInt = (value, fallback, min, max) => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
};

export async function updateMe(req, res) {
  req.user.set(validateProfile(req.body));
  await req.user.save();
  res.json({ user: privateUser(req.user) });
}

// Every other student, best skill match first, optionally filtered by name or skill.
export async function listStudents(req, res) {
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 50) : '';
  const limit = clampInt(req.query.limit, 24, 1, 100);

  const filter = { _id: { $ne: req.user._id } };
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { 'skillsOffered.name': pattern }, { 'skillsWanted.name': pattern }];
  }

  // Optional ?sort=name for A-Z; anything else keeps the default best-match ordering.
  const byName = (a, b) => a.user.name.localeCompare(b.user.name);
  const order = req.query.sort === 'name' ? byName : byMatchThenName;

  const students = await User.find(filter).lean();
  const ranked = students.map((user) => ({ user, match: computeMatch(req.user, user) })).sort(order);

  res.json({
    total: ranked.length,
    students: ranked.slice(0, limit).map(({ user, match }) => ({ ...publicUser(user), match })),
  });
}

export async function recommended(req, res) {
  const limit = clampInt(req.query.limit, 6, 1, 20);
  const students = await User.find({ _id: { $ne: req.user._id } }).lean();
  res.json({
    students: recommend(req.user, students, limit).map(({ user, match }) => ({ ...publicUser(user), match })),
  });
}

export async function getStudent(req, res) {
  const { id } = req.params;
  const student = OBJECT_ID_RE.test(id) ? await User.findById(id).lean() : null;
  if (!student) throw new HttpError(404, 'Student not found.');
  res.json({ student: { ...publicUser(student), match: computeMatch(req.user, student) } });
}
