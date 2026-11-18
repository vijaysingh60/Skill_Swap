// Mirrors the server's rules so people get instant feedback; the server still re-validates everything
// (and is the source of truth — if ALLOWED_EMAIL_DOMAINS is customised on the server, this list won't
// know about it until updated here too).
export type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ALLOWED_EMAIL_DOMAINS = ['uohyd.ac.in', 'uohyd.ernet.in'];

const emailDomainAllowed = (email: string) => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return ALLOWED_EMAIL_DOMAINS.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
};

export const hasErrors = (errors: FieldErrors) => Object.keys(errors).length > 0;

export function validateLoginForm(v: { email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (!v.email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Enter a valid email address.';
  if (!v.password) errors.password = 'Password is required.';
  return errors;
}

export function validateRegisterForm(v: { name: string; email: string; password: string; university: string; department: string }): FieldErrors {
  const errors = validateLoginForm(v);
  if (!v.name.trim()) errors.name = 'Name is required.';
  else if (v.name.trim().length > 80) errors.name = 'Name must be at most 80 characters.';
  if (!errors.email && !emailDomainAllowed(v.email.trim())) {
    errors.email = `Please use your university email address (e.g. you@${ALLOWED_EMAIL_DOMAINS[0]}).`;
  }
  if (!v.university.trim()) errors.university = 'University is required.';
  if (!v.department.trim()) errors.department = 'Department is required.';
  if (v.password && v.password.length < 8) errors.password = 'Password must be at least 8 characters.';
  return errors;
}

export function validateProfileForm(v: { name: string; university: string; department: string; bio: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (!v.name.trim()) errors.name = 'Name is required.';
  if (!v.university.trim()) errors.university = 'University is required.';
  if (!v.department.trim()) errors.department = 'Department is required.';
  if (v.bio.length > 300) errors.bio = 'Bio must be at most 300 characters.';
  return errors;
}
