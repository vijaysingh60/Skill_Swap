// Integration-test harness: starts the real Express app against a throwaway "_test" database.
import { generateKeyPairSync } from 'node:crypto';
import http from 'node:http';

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
const { default: mongoose } = await import('mongoose');
const { User } = await import('../src/models/User.js');
const { Session } = await import('../src/models/Session.js');
const { Payment } = await import('../src/models/Payment.js');
export { Payment, Session, User };

let server;
let baseUrl;

export async function startTestServer() {
  await connectDb();
  await Promise.all([User.init(), Session.init(), Payment.init()]); // make sure indexes exist
  await resetDb();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

export async function stopTestServer() {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
}

export async function resetDb() {
  await Promise.all([User.deleteMany({}), Session.deleteMany({}), Payment.deleteMany({})]);
}

export async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

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
