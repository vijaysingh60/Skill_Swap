import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { sendVerificationEmail } from '../utils/mailer.js';
import { privateUser } from '../utils/serialize.js';
import { validateLogin, validateRegister, validateResendVerification, validateVerifyToken } from '../utils/validate.js';

const SALT_ROUNDS = 10;
const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;
// Compared against when the email is unknown so both login failures take similar time.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', SALT_ROUNDS);

const emailTaken = () => new HttpError(409, 'Please fix the highlighted fields.', { email: 'An account with this email already exists.' });

const newVerificationToken = () => ({
  emailVerificationToken: crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex'),
  emailVerificationExpires: new Date(Date.now() + VERIFICATION_EXPIRY_MS),
});

export async function register(req, res) {
  const { password, ...data } = validateRegister(req.body);

  if (await User.exists({ email: data.email })) throw emailTaken();

  let user;
  try {
    user = await User.create({ ...data, passwordHash: await bcrypt.hash(password, SALT_ROUNDS), ...newVerificationToken() });
  } catch (err) {
    if (err.code === 11000) throw emailTaken(); // lost a race with a concurrent signup
    throw err;
  }
  // Registration succeeds either way — a slow or failed send shouldn't block account creation.
  void sendVerificationEmail(user, user.emailVerificationToken);

  // The first session is granted right away (nicer onboarding, and keeps this endpoint simple to
  // test), but logging back in later requires a verified email — see login() below.
  res.status(201).json({ token: signToken(user), user: privateUser(user) });
}

export async function login(req, res) {
  const { email, password } = validateLogin(req.body);

  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !valid) throw new HttpError(401, 'Invalid email or password.');
  if (!user.emailVerified) {
    throw new HttpError(403, 'Please verify your email before logging in. Check your inbox for the link, or request a new one.', undefined, { emailNotVerified: true });
  }

  res.json({ token: signToken(user), user: privateUser(user) });
}

export function me(req, res) {
  res.json({ user: privateUser(req.user) });
}

export async function verifyEmail(req, res) {
  const { token } = validateVerifyToken(req.body);

  const user = await User.findOne({ emailVerificationToken: token, emailVerificationExpires: { $gt: new Date() } }).select(
    '+emailVerificationToken +emailVerificationExpires',
  );
  if (!user) throw new HttpError(400, 'This verification link is invalid or has expired. Request a new one.');

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  // Verifying also signs them in, so the link can drop them straight onto the dashboard.
  res.json({ token: signToken(user), user: privateUser(user) });
}

export async function resendVerification(req, res) {
  const { email } = validateResendVerification(req.body);

  // Same response whether the account exists, is already verified, or doesn't exist at all —
  // otherwise this endpoint could be used to check which emails are registered.
  const generic = { message: "If that email needs verifying, we've sent a new link." };

  const user = await User.findOne({ email, emailVerified: false });
  if (user) {
    Object.assign(user, newVerificationToken());
    await user.save();
    void sendVerificationEmail(user, user.emailVerificationToken);
  }
  res.json(generic);
}
