// Integration-test harness: starts the real Express app against a throwaway "_test" database.
import { generateKeyPairSync } from 'node:crypto';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/skillswap_test';
// Allow both the real university domain and @example.com, since most fixtures use the latter.
process.env.ALLOWED_EMAIL_DOMAINS = 'uohyd.ac.in,example.com';

// A throwaway RSA key pair stands in for the JaaS key, so signed room tokens can be verified for real.
const keys = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
export const JAAS = { appId: 'vpaas-magic-cookie-test', keyId: 'key123', publicKey: keys.publicKey, privateKey: keys.privateKey };
process.env.JAAS_APP_ID = JAAS.appId;
process.env.JAAS_KEY_ID = JAAS.keyId;
process.env.JAAS_PRIVATE_KEY = JAAS.privateKey.replace(/\n/g, '\\n');

// The suite wipes the database, so refuse to run against anything that isn't clearly a test DB.
if (!/_test(\?|$)/.test(process.env.MONGODB_URI)) {
  throw new Error(`Refusing to run tests against "${process.env.MONGODB_URI}": the database name must end in "_test".`);
}

const { default: app } = await import('../src/app.js');
const { connectDb } = await import('../src/config/db.js');
const { attachRealtime } = await import('../src/realtime.js');
const { default: mongoose } = await import('mongoose');
const { User } = await import('../src/models/User.js');
const { ExchangeRequest } = await import('../src/models/ExchangeRequest.js');
const { Session } = await import('../src/models/Session.js');
const { Payment } = await import('../src/models/Payment.js');
const { Message } = await import('../src/models/Message.js');
export { Message, Payment, Session, User };

let server;
let baseUrl;

export async function startTestServer() {
  await connectDb();
  await Promise.all([User.init(), ExchangeRequest.init(), Session.init(), Payment.init(), Message.init()]); // make sure indexes exist
  await resetDb();
  server = http.createServer(app);
  attachRealtime(server);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

/** A connected, authenticated Socket.IO client for `token`'s user. Caller must call .close(). */
export async function connectSocket(token) {
  const socket = ioClient(baseUrl, { auth: { token }, transports: ['websocket'], reconnection: false, forceNew: true });
  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
  });
  return socket;
}

/** Promise-wraps a Socket.IO ack callback, so tests can `await` a round trip instead of nesting callbacks. */
export const emitAsync = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

export async function stopTestServer() {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
}

export async function resetDb() {
  await Promise.all([User.deleteMany({}), ExchangeRequest.deleteMany({}), Session.deleteMany({}), Payment.deleteMany({}), Message.deleteMany({})]);
}

export async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// Fixture accounts should just work without a separate verify-email step; dedicated tests for that
// flow register directly via api('POST', '/auth/register', ...) instead of this helper.
export const verifyEmail = (email) => User.updateOne({ email }, { emailVerified: true });

export async function registerUser(overrides = {}) {
  const n = Math.random().toString(36).slice(2, 8);
  const payload = {
    name: `Student ${n}`,
    email: `${n}@example.com`,
    password: 'password123',
    university: 'University of Hyderabad',
    department: 'Computer Science',
    ...overrides,
  };
  const res = await api('POST', '/auth/register', { body: payload });
  if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
  await verifyEmail(payload.email);
  return { token: res.body.token, user: res.body.user, password: payload.password, email: payload.email };
}

export async function setSkills(token, skillsOffered, skillsWanted) {
  const res = await api('PUT', '/users/me', { token, body: { skillsOffered, skillsWanted } });
  if (res.status !== 200) throw new Error(`setSkills failed: ${JSON.stringify(res.body)}`);
  return res.body.user;
}

export const makeAdmin = (userId) => User.updateOne({ _id: userId }, { role: 'admin' });

export const makeInstructor = (userId, headline = 'Experienced tutor', skills = ['Python']) =>
  User.updateOne(
    { _id: userId },
    { 'instructor.status': 'verified', 'instructor.headline': headline, 'instructor.experience': 'x'.repeat(40), skillsOffered: skills.map((name) => ({ name, level: 'advanced' })) },
  );

export const minutesFromNow = (minutes) => new Date(Date.now() + minutes * 60_000).toISOString();

export async function createClass(token, overrides = {}) {
  const res = await api('POST', '/sessions', {
    token,
    body: { title: 'Python basics', skill: 'Python', description: 'Intro class', startsAt: minutesFromNow(120), durationMinutes: 60, capacity: 10, ...overrides },
  });
  if (res.status !== 201) throw new Error(`createClass failed: ${JSON.stringify(res.body)}`);
  return res.body.session;
}
