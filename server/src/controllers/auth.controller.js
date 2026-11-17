import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { privateUser } from '../utils/serialize.js';
import { validateLogin, validateRegister } from '../utils/validate.js';

const SALT_ROUNDS = 10;
// Compared against when the email is unknown so both login failures take similar time.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', SALT_ROUNDS);

const emailTaken = () => new HttpError(409, 'Please fix the highlighted fields.', { email: 'An account with this email already exists.' });

export async function register(req, res) {
  const { password, ...data } = validateRegister(req.body);

  if (await User.exists({ email: data.email })) throw emailTaken();

  let user;
  try {
    user = await User.create({ ...data, passwordHash: await bcrypt.hash(password, SALT_ROUNDS) });
  } catch (err) {
    if (err.code === 11000) throw emailTaken(); // lost a race with a concurrent signup
    throw err;
  }
  res.status(201).json({ token: signToken(user), user: privateUser(user) });
}

export async function login(req, res) {
  const { email, password } = validateLogin(req.body);

  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !valid) throw new HttpError(401, 'Invalid email or password.');

  res.json({ token: signToken(user), user: privateUser(user) });
}

export function me(req, res) {
  res.json({ user: privateUser(req.user) });
}
