import type { Applicant, ClassSession, CurrentUser, InstructorStatus, Mode, Skill, Student, VideoRoom } from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
const TOKEN_KEY = 'skillswap_token';

export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  /** The raw error body, for extra details such as when a room opens. */
  data: Record<string, unknown>;

  constructor(status: number, message: string, fields: Record<string, string> = {}, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.data = data;
  }
}

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: the session just won't persist */
  }
};

let onUnauthorized: () => void = () => {};
/** Called when an authenticated request comes back 401 (expired or invalid token). */
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // A 401 on a request that carried a token means the session is no longer valid.
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, data?.message ?? 'Something went wrong. Please try again.', data?.errors, data ?? {});
  }
  return data as T;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  university: string;
  department: string;
}

export interface ProfileInput {
  name: string;
  university: string;
  department: string;
  bio: string;
  skillsOffered: Skill[];
  skillsWanted: Skill[];
}

export interface NewSessionInput {
  title: string;
  skill: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  /** Rupees; 0 (the default) means free. */
  price: number;
}

export interface Receipt {
  id: string;
  amount: number;
  provider: 'mock';
  createdAt: string;
}

export type SessionView = 'browse' | 'joined' | 'hosting';

export const api = {
  register: (input: RegisterInput) => request<{ token: string; user: CurrentUser }>('POST', '/auth/register', input),
  login: (email: string, password: string) => request<{ token: string; user: CurrentUser }>('POST', '/auth/login', { email, password }),
  me: () => request<{ user: CurrentUser }>('GET', '/auth/me'),
  updateProfile: (input: Partial<ProfileInput>) => request<{ user: CurrentUser }>('PUT', '/users/me', input),

  listStudents: (search: string, limit: number, sort: 'match' | 'name' = 'match') =>
    request<{ students: Student[]; total: number }>('GET', `/users?search=${encodeURIComponent(search)}&limit=${limit}&sort=${sort}`),
  recommended: (limit = 6) => request<{ students: Student[] }>('GET', `/users/recommended?limit=${limit}`),
  getStudent: (id: string) => request<{ student: Student }>('GET', `/users/${encodeURIComponent(id)}`),

  applyToTeach: (headline: string, experience: string) => request<{ user: CurrentUser }>('POST', '/instructor/apply', { headline, experience }),
  setMode: (mode: Mode) => request<{ user: CurrentUser }>('PUT', '/users/me/mode', { mode }),

  listSessions: (view: SessionView, options: { q?: string; instructor?: string } = {}) => {
    const params = new URLSearchParams({ view });
    if (options.q) params.set('q', options.q);
    if (options.instructor) params.set('instructor', options.instructor);
    return request<{ sessions: ClassSession[] }>('GET', `/sessions?${params}`);
  },
  createSession: (input: NewSessionInput) => request<{ session: ClassSession }>('POST', '/sessions', input),
  payForSession: (id: string) => request<{ payment: Receipt }>('POST', `/sessions/${encodeURIComponent(id)}/pay`),
  joinSession: (id: string) => request<{ session: ClassSession }>('POST', `/sessions/${encodeURIComponent(id)}/join`),
  leaveSession: (id: string) => request<{ session: ClassSession }>('DELETE', `/sessions/${encodeURIComponent(id)}/join`),
  cancelSession: (id: string) => request<{ session: ClassSession }>('POST', `/sessions/${encodeURIComponent(id)}/cancel`),
  getRoom: (id: string) => request<{ room: VideoRoom }>('GET', `/sessions/${encodeURIComponent(id)}/room`),

  listApplications: (status: Exclude<InstructorStatus, 'none'>) =>
    request<{ status: string; applications: Applicant[]; counts: Record<'pending' | 'verified' | 'rejected', number> }>('GET', `/admin/instructors?status=${status}`),
  decideApplication: (id: string, decision: 'approve' | 'reject' | 'revoke', note = '') =>
    request<{ application: Applicant }>('PATCH', `/admin/instructors/${encodeURIComponent(id)}`, { decision, note }),
};
