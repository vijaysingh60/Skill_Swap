import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';

export function signToken(user) {
  return jwt.sign({ sub: String(user._id) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// Requires "Authorization: Bearer <token>" and attaches the user to req.user.
export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Please log in to continue.');

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please log in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'Your session is no longer valid. Please log in again.');
  req.user = user;
  next();
}

export function requireAdmin(req, _res, next) {
  if (req.user.role !== 'admin') throw new HttpError(403, 'Admins only.');
  next();
}

// Hosting classes is limited to instructors an admin has verified.
export function requireVerifiedInstructor(req, _res, next) {
  if (req.user.instructor?.status !== 'verified') {
    throw new HttpError(403, 'Only verified instructors can do this. Apply to become an instructor first.');
  }
  next();
}
