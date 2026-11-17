// Skill names are compared case-insensitively with collapsed whitespace.
export function normalizeSkill(name) {
  return String(name).trim().replace(/\s+/g, ' ').toLowerCase();
}

export function findSkill(skills, name) {
  const key = normalizeSkill(name);
  return skills.find((s) => normalizeSkill(s.name) === key);
}

export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
