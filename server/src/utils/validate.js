import { config } from '../config/index.js';
import { HttpError } from './httpError.js';
import { SKILL_LEVELS } from '../models/User.js';
import { normalizeSkill } from './skills.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// True if the email's domain is the allowed one, or a subdomain of it (e.g. "cs.uohyd.ac.in").
// An empty allow-list (ALLOWED_EMAIL_DOMAINS="") means any domain is accepted.
export function emailDomainAllowed(email, domains = config.allowedEmailDomains) {
  if (domains.length === 0) return true;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return domains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
}
export const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
const MAX_SKILLS = 15;

// Non-strings (objects, arrays, numbers) are treated as "missing" so they can never reach a query.
const text = (value) => (typeof value === 'string' ? value.trim() : '');

function finish(errors, data) {
  if (Object.keys(errors).length > 0) throw new HttpError(400, 'Please fix the highlighted fields.', errors);
  return data;
}

function checkLength(errors, field, value, label, { min = 1, max }) {
  if (value.length < min) errors[field] = `${label} is required.`;
  else if (value.length > max) errors[field] = `${label} must be at most ${max} characters.`;
}

function parseSkills(errors, field, value, label) {
  if (!Array.isArray(value)) {
    errors[field] = `${label} must be a list.`;
    return [];
  }
  if (value.length > MAX_SKILLS) {
    errors[field] = `You can list at most ${MAX_SKILLS} skills.`;
    return [];
  }
  const seen = new Set();
  const skills = [];
  for (const item of value) {
    const name = text(item?.name).replace(/\s+/g, ' ');
    const level = item?.level ?? 'beginner';
    if (!name || name.length > 40) {
      errors[field] = 'Each skill needs a name of up to 40 characters.';
      return [];
    }
    if (!SKILL_LEVELS.includes(level)) {
      errors[field] = `Skill level must be one of: ${SKILL_LEVELS.join(', ')}.`;
      return [];
    }
    if (seen.has(normalizeSkill(name))) {
      errors[field] = `"${name}" is listed more than once.`;
      return [];
    }
    seen.add(normalizeSkill(name));
    skills.push({ name, level });
  }
  return skills;
}

export function validateRegister(body = {}) {
  const errors = {};
  const name = text(body.name);
  const email = text(body.email).toLowerCase();
  const university = text(body.university);
  const department = text(body.department);
  const password = typeof body.password === 'string' ? body.password : '';

  checkLength(errors, 'name', name, 'Name', { max: 80 });
  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = 'Enter a valid email address.';
  else if (!emailDomainAllowed(email)) {
    errors.email = `Please use your university email address (e.g. you@${config.allowedEmailDomains[0]}).`;
  }
  checkLength(errors, 'university', university, 'University', { max: 120 });
  checkLength(errors, 'department', department, 'Department', { max: 120 });
  if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  // bcrypt only uses the first 72 bytes of a password.
  else if (Buffer.byteLength(password) > 72) errors.password = 'Password must be at most 72 bytes.';

  return finish(errors, { name, email, university, department, password });
}

export function validateLogin(body = {}) {
  const errors = {};
  const email = text(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email) errors.email = 'Email is required.';
  if (!password) errors.password = 'Password is required.';
  return finish(errors, { email, password });
}

// Only fields present in the body are validated and updated.
export function validateProfile(body = {}) {
  const errors = {};
  const data = {};

  for (const [field, label, max] of [
    ['name', 'Name', 80],
    ['university', 'University', 120],
    ['department', 'Department', 120],
  ]) {
    if (body[field] === undefined) continue;
    data[field] = text(body[field]);
    checkLength(errors, field, data[field], label, { max });
  }
  if (body.bio !== undefined) {
    data.bio = text(body.bio);
    checkLength(errors, 'bio', data.bio, 'Bio', { min: 0, max: 300 });
  }
  if (body.skillsOffered !== undefined) data.skillsOffered = parseSkills(errors, 'skillsOffered', body.skillsOffered, 'Skills you can teach');
  if (body.skillsWanted !== undefined) data.skillsWanted = parseSkills(errors, 'skillsWanted', body.skillsWanted, 'Skills you want to learn');

  return finish(errors, data);
}

// ---------- Instructors and classes ----------

const lengthMessage = (label, value, min, max) =>
  !value ? `${label} is required.` : value.length < min ? `${label} must be at least ${min} characters.` : value.length > max ? `${label} must be at most ${max} characters.` : null;

export function validateInstructorApplication(body = {}) {
  const errors = {};
  const headline = text(body.headline);
  const experience = text(body.experience);
  const headlineError = lengthMessage('Headline', headline, 5, 80);
  if (headlineError) errors.headline = headlineError;
  const experienceError = lengthMessage('Experience', experience, 30, 800);
  if (experienceError) errors.experience = experienceError;
  return finish(errors, { headline, experience });
}

export function validateMode(body = {}) {
  const mode = text(body.mode);
  return finish(['student', 'instructor'].includes(mode) ? {} : { mode: 'Mode must be "student" or "instructor".' }, { mode });
}

export function validateDecision(body = {}) {
  const errors = {};
  const decision = text(body.decision);
  const note = text(body.note);
  if (!['approve', 'reject', 'revoke'].includes(decision)) errors.decision = 'Decision must be "approve", "reject" or "revoke".';
  // The person is told why, so rejecting or revoking needs a reason.
  else if (decision !== 'approve' && note.length < 5) errors.note = 'Add a short reason (at least 5 characters).';
  if (note.length > 300) errors.note = 'Note must be at most 300 characters.';
  return finish(errors, { decision, note });
}

const wholeNumber = (value, fallback) => {
  const n = value === undefined || value === '' ? fallback : Number(value);
  return Number.isInteger(n) ? n : NaN;
};

export function validateNewSession(body = {}, now = new Date(), { minLeadMinutes, maxAheadDays }) {
  const errors = {};
  const title = text(body.title);
  const skill = text(body.skill);
  const description = text(body.description);
  const startsAt = new Date(typeof body.startsAt === 'string' ? body.startsAt : NaN);
  const durationMinutes = wholeNumber(body.durationMinutes, 60);
  const capacity = wholeNumber(body.capacity, 20);
  const price = wholeNumber(body.price, 0);

  const titleError = lengthMessage('Title', title, 3, 80);
  if (titleError) errors.title = titleError;
  const skillError = lengthMessage('Skill', skill, 1, 40);
  if (skillError) errors.skill = skillError;
  if (description.length > 500) errors.description = 'Description must be at most 500 characters.';

  if (Number.isNaN(startsAt.getTime())) errors.startsAt = 'Choose a date and time.';
  else if (startsAt.getTime() < now.getTime() + minLead(minLeadMinutes)) errors.startsAt = `Start at least ${minLeadMinutes} minutes from now.`;
  else if (startsAt.getTime() > now.getTime() + maxAheadDays * 86_400_000) errors.startsAt = `Schedule at most ${maxAheadDays} days ahead.`;

  if (!(durationMinutes >= 15 && durationMinutes <= 240)) errors.durationMinutes = 'Duration must be between 15 and 240 minutes.';
  if (!(capacity >= 1 && capacity <= 100)) errors.capacity = 'Capacity must be between 1 and 100 students.';
  if (!(price >= 0 && price <= 10_000)) errors.price = 'Price must be between ₹0 (free) and ₹10,000.';

  return finish(errors, { title, skill, description, startsAt, durationMinutes, capacity, price });
}

const minLead = (minutes) => minutes * 60_000;
