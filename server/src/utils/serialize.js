import { phaseOf, roomClosesAt, roomOpensAt } from './sessions.js';

const skills = (list = []) => list.map((s) => ({ name: s.name, level: s.level }));
const idOf = (doc) => String(doc._id ?? doc);

// Documents saved before roles existed (and .lean() results) may lack these fields, so read defensively.
export const isVerifiedInstructor = (user) => user.instructor?.status === 'verified';
export const effectiveMode = (user) => (isVerifiedInstructor(user) && user.mode === 'instructor' ? 'instructor' : 'student');

// What other students are allowed to see. Never includes email or password data.
export function publicUser(user) {
  const verified = isVerifiedInstructor(user);
  return {
    id: idOf(user),
    name: user.name,
    university: user.university,
    department: user.department,
    bio: user.bio || '',
    skillsOffered: skills(user.skillsOffered),
    skillsWanted: skills(user.skillsWanted),
    isInstructor: verified,
    ...(verified && { instructorHeadline: user.instructor.headline || '' }),
  };
}

// What a user sees about themselves, including their own instructor application.
export function privateUser(user) {
  const i = user.instructor ?? {};
  return {
    ...publicUser(user),
    email: user.email,
    role: user.role ?? 'user',
    mode: effectiveMode(user),
    instructor: {
      status: i.status ?? 'none',
      headline: i.headline ?? '',
      experience: i.experience ?? '',
      appliedAt: i.appliedAt ?? null,
      reviewedAt: i.reviewedAt ?? null,
      reviewNote: i.reviewNote ?? '',
    },
  };
}

// What an admin sees when reviewing an instructor application (includes email to confirm identity).
export function applicantForAdmin(user) {
  const i = user.instructor ?? {};
  return {
    id: idOf(user),
    name: user.name,
    email: user.email,
    university: user.university,
    department: user.department,
    skillsOffered: skills(user.skillsOffered),
    status: i.status ?? 'none',
    headline: i.headline ?? '',
    experience: i.experience ?? '',
    appliedAt: i.appliedAt ?? null,
    reviewedAt: i.reviewedAt ?? null,
    reviewNote: i.reviewNote ?? '',
  };
}

// A student as shown inside an exchange request. The email is only shared
// once a request has been accepted, so the two students can get in touch.
function requestParty(user, status) {
  return {
    id: idOf(user),
    name: user.name,
    university: user.university,
    department: user.department,
    ...(status === 'accepted' ? { email: user.email } : {}),
  };
}

// Expects requester and recipient to be populated.
export function exchangeRequest(doc) {
  return {
    id: idOf(doc),
    status: doc.status,
    skillWanted: doc.skillWanted,
    skillOffered: doc.skillOffered,
    message: doc.message || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    requester: requestParty(doc.requester, doc.status),
    recipient: requestParty(doc.recipient, doc.status),
  };
}

/**
 * A class as seen by `viewerId`. Expects `instructor` populated. Only the host gets the attendee
 * list (pass `attendees` populated); everyone else just sees counts.
 */
export function sessionDto(session, viewerId) {
  const attendeeIds = session.attendees.map(idOf);
  const host = session.instructor;
  const populatedAttendees = session.attendees.length > 0 && typeof session.attendees[0] === 'object' && 'name' in session.attendees[0];
  const isHost = idOf(host) === String(viewerId);
  // Only the host sees who signed up. An unpopulated, non-empty list can't be named, so it is left out.
  const hostAttendees = !isHost
    ? undefined
    : populatedAttendees
      ? session.attendees.map((a) => ({ id: idOf(a), name: a.name, department: a.department }))
      : session.attendees.length === 0
        ? []
        : undefined;
  return {
    id: idOf(session),
    title: session.title,
    skill: session.skill,
    description: session.description || '',
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    durationMinutes: session.durationMinutes,
    capacity: session.capacity,
    attendeeCount: attendeeIds.length,
    spotsLeft: Math.max(0, session.capacity - attendeeIds.length),
    status: session.status,
    phase: phaseOf(session),
    roomOpensAt: roomOpensAt(session),
    roomClosesAt: roomClosesAt(session),
    isHost,
    joined: attendeeIds.includes(String(viewerId)),
    instructor: {
      id: idOf(host),
      name: host.name,
      department: host.department,
      headline: host.instructor?.headline || '',
    },
    ...(hostAttendees && { attendees: hostAttendees }),
  };
}
