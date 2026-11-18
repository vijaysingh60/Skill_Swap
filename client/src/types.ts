export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

export interface Skill {
  name: string;
  level: SkillLevel;
}

export interface Match {
  score: number;
  mutual: boolean;
  theyCanTeachMe: string[];
  iCanTeachThem: string[];
}

export interface Student {
  id: string;
  name: string;
  university: string;
  department: string;
  bio: string;
  skillsOffered: Skill[];
  skillsWanted: Skill[];
  match?: Match;
  /** True once an admin has verified this student as an instructor. */
  isInstructor: boolean;
  instructorHeadline?: string;
}

export type InstructorStatus = 'none' | 'pending' | 'verified' | 'rejected';
export type Mode = 'student' | 'instructor';

export interface InstructorInfo {
  status: InstructorStatus;
  headline: string;
  experience: string;
  appliedAt: string | null;
  reviewedAt: string | null;
  /** The admin's reason, shown to the applicant after a rejection. */
  reviewNote: string;
}

export interface CurrentUser extends Student {
  email: string;
  emailVerified: boolean;
  role: 'user' | 'admin';
  /** Which view the user is in. Always "student" unless they are a verified instructor. */
  mode: Mode;
  instructor: InstructorInfo;
}

export type RequestStatus = 'pending' | 'accepted' | 'rejected';

export interface RequestParty {
  id: string;
  name: string;
  university: string;
  department: string;
  /** Only present once the request has been accepted. */
  email?: string;
}

export interface ExchangeRequest {
  id: string;
  status: RequestStatus;
  skillWanted: string;
  skillOffered: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  requester: RequestParty;
  recipient: RequestParty;
}

export type SessionPhase = 'upcoming' | 'open' | 'ended' | 'cancelled';

export interface ClassSession {
  id: string;
  title: string;
  skill: string;
  description: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  capacity: number;
  attendeeCount: number;
  spotsLeft: number;
  /** In rupees. 0 = free, which is most classes. */
  price: number;
  /** Whether the current viewer has already paid (only meaningful when price > 0). */
  paidByMe: boolean;
  status: 'scheduled' | 'cancelled';
  phase: SessionPhase;
  roomOpensAt: string;
  roomClosesAt: string;
  isHost: boolean;
  joined: boolean;
  instructor: { id: string; name: string; department: string; headline: string };
  /** Only present for the host. */
  attendees?: { id: string; name: string; department: string }[];
}

export interface VideoRoom {
  provider: 'jaas';
  domain: string;
  appId: string;
  roomName: string;
  jwt: string;
  displayName: string;
  moderator: boolean;
  title: string;
  closesAt: string;
}

/** One message in the chat between the two students of an accepted exchange request. */
export interface ChatMessage {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

export interface Applicant {
  id: string;
  name: string;
  email: string;
  university: string;
  department: string;
  skillsOffered: Skill[];
  status: InstructorStatus;
  headline: string;
  experience: string;
  appliedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string;
}
