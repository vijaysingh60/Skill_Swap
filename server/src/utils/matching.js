import { normalizeSkill } from './skills.js';

/**
 * Compare the current user with another student.
 *
 *  - theyCanTeachMe: skills the other student teaches that I want to learn
 *  - iCanTeachThem:  skills I teach that the other student wants to learn
 *  - mutual:         both of the above are non-empty (a true skill swap)
 *
 * Score = 3 per skill they can teach me + 2 per skill I can teach them,
 * plus a flat 5 bonus for a mutual match, so complementary pairs rank first.
 */
export function computeMatch(me, other) {
  const myWanted = new Set(me.skillsWanted.map((s) => normalizeSkill(s.name)));
  const theirWanted = new Set(other.skillsWanted.map((s) => normalizeSkill(s.name)));

  const theyCanTeachMe = other.skillsOffered.filter((s) => myWanted.has(normalizeSkill(s.name))).map((s) => s.name);
  const iCanTeachThem = me.skillsOffered.filter((s) => theirWanted.has(normalizeSkill(s.name))).map((s) => s.name);
  const mutual = theyCanTeachMe.length > 0 && iCanTeachThem.length > 0;

  const score = theyCanTeachMe.length * 3 + iCanTeachThem.length * 2 + (mutual ? 5 : 0);
  return { score, mutual, theyCanTeachMe, iCanTeachThem };
}

// Highest score first; ties broken alphabetically so the order is stable.
export function byMatchThenName(a, b) {
  return b.match.score - a.match.score || a.user.name.localeCompare(b.user.name);
}

/** Students who teach something the current user wants to learn, best matches first. */
export function recommend(me, others, limit) {
  return others
    .map((user) => ({ user, match: computeMatch(me, user) }))
    .filter(({ match }) => match.theyCanTeachMe.length > 0)
    .sort(byMatchThenName)
    .slice(0, limit);
}
