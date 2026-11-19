import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { api, registerUser, resetDb, setSkills, startTestServer, stopTestServer, User } from './helpers.js';

before(startTestServer);
after(stopTestServer);

const skill = (name, level = 'intermediate') => ({ name, level });

describe('auth', () => {
  before(resetDb);

  it('registers a student, hashes the password, and never returns it', async () => {
    const res = await api('POST', '/auth/register', {
      body: { name: 'Ada', email: 'Ada@Example.com ', password: 'password123', university: 'University of Hyderabad', department: 'Maths' },
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, 'ada@example.com');
    assert.equal(JSON.stringify(res.body).includes('password'), false);

    const stored = await User.findOne({ email: 'ada@example.com' }).select('+passwordHash');
    assert.ok(stored.passwordHash.startsWith('$2'), 'password should be a bcrypt hash');
    assert.notEqual(stored.passwordHash, 'password123');
  });

  it('rejects invalid registration input with field errors', async () => {
    const res = await api('POST', '/auth/register', { body: { name: '', email: 'nope', password: 'short', university: '', department: '' } });
    assert.equal(res.status, 400);
    assert.deepEqual(Object.keys(res.body.errors).sort(), ['department', 'email', 'name', 'password', 'university']);
  });

  it('rejects non-string values (NoSQL injection attempt)', async () => {
    const res = await api('POST', '/auth/login', { body: { email: { $gt: '' }, password: { $gt: '' } } });
    assert.equal(res.status, 400);
  });

  it('rejects a duplicate email', async () => {
    const res = await api('POST', '/auth/register', {
      body: { name: 'Ada 2', email: 'ada@example.com', password: 'password123', university: 'UoH', department: 'Maths' },
    });
    assert.equal(res.status, 409);
    assert.ok(res.body.errors.email);
  });

  it('logs in with the right password and rejects the wrong one', async () => {
    const ok = await api('POST', '/auth/login', { body: { email: 'ada@example.com', password: 'password123' } });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);

    const badPassword = await api('POST', '/auth/login', { body: { email: 'ada@example.com', password: 'wrong-password' } });
    const unknownEmail = await api('POST', '/auth/login', { body: { email: 'ghost@example.com', password: 'password123' } });
    assert.equal(badPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.equal(badPassword.body.message, unknownEmail.body.message);
  });

  it('protects authenticated routes', async () => {
    for (const [method, path] of [['GET', '/auth/me'], ['PUT', '/users/me'], ['GET', '/users'], ['GET', '/users/recommended']]) {
      const res = await api(method, path);
      assert.equal(res.status, 401, `${method} ${path}`);
    }
    assert.equal((await api('GET', '/auth/me', { token: 'garbage' })).status, 401);
  });

  it('returns the current user from /auth/me', async () => {
    const { token } = await api('POST', '/auth/login', { body: { email: 'ada@example.com', password: 'password123' } }).then((r) => r.body);
    const res = await api('GET', '/auth/me', { token });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.name, 'Ada');
  });
});

describe('profiles', () => {
  before(resetDb);

  it('updates bio and skills, and validates them', async () => {
    const { token } = await registerUser();
    const ok = await api('PUT', '/users/me', {
      token,
      body: { bio: 'Hello there', skillsOffered: [skill('Python', 'advanced')], skillsWanted: [skill('Guitar', 'beginner')] },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.user.bio, 'Hello there');
    assert.deepEqual(ok.body.user.skillsOffered, [{ name: 'Python', level: 'advanced' }]);

    const badLevel = await api('PUT', '/users/me', { token, body: { skillsOffered: [{ name: 'Go', level: 'wizard' }] } });
    const dupes = await api('PUT', '/users/me', { token, body: { skillsWanted: [skill('Chess'), skill(' chess ')] } });
    const longBio = await api('PUT', '/users/me', { token, body: { bio: 'x'.repeat(301) } });
    const emptyName = await api('PUT', '/users/me', { token, body: { name: '  ' } });
    for (const res of [badLevel, dupes, longBio, emptyName]) assert.equal(res.status, 400);

    // failed updates changed nothing
    const me = await api('GET', '/auth/me', { token });
    assert.deepEqual(me.body.user.skillsOffered, [{ name: 'Python', level: 'advanced' }]);
  });

  it("ignores attempts to change email or other protected fields", async () => {
    const { token, email } = await registerUser();
    const res = await api('PUT', '/users/me', { token, body: { email: 'hacker@example.com', passwordHash: 'x', bio: 'ok' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, email);
  });
});

describe('discover and matching', () => {
  let me, guitarist, cook, coder;
  before(async () => {
    await resetDb();
    me = await registerUser({ name: 'Me Student' });
    guitarist = await registerUser({ name: 'Gita Guitar' });
    cook = await registerUser({ name: 'Carl Cook' });
    coder = await registerUser({ name: 'Cody Coder' });
    await setSkills(me.token, [skill('Python')], [skill('Guitar'), skill('Cooking')]);
    await setSkills(guitarist.token, [skill('Guitar')], [skill('Python')]); // mutual
    await setSkills(cook.token, [skill('Cooking')], []); // one way
    await setSkills(coder.token, [skill('Python')], [skill('Chess')]); // teaches nothing I want
  });

  it('never lists the current user or exposes emails', async () => {
    const res = await api('GET', '/users', { token: me.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 3);
    assert.ok(!res.body.students.some((s) => s.id === me.user.id));
    assert.equal(JSON.stringify(res.body).includes('@example.com'), false);
  });

  it('ranks the mutual match first', async () => {
    const res = await api('GET', '/users', { token: me.token });
    assert.deepEqual(res.body.students.map((s) => s.name), ['Gita Guitar', 'Carl Cook', 'Cody Coder']);
    assert.equal(res.body.students[0].match.mutual, true);
  });

  it('searches by name and by skill, case-insensitively', async () => {
    const byName = await api('GET', '/users?search=carl', { token: me.token });
    assert.deepEqual(byName.body.students.map((s) => s.name), ['Carl Cook']);
    const bySkill = await api('GET', '/users?search=GUIT', { token: me.token });
    assert.deepEqual(bySkill.body.students.map((s) => s.name), ['Gita Guitar']);
    const none = await api('GET', '/users?search=zzzz', { token: me.token });
    assert.equal(none.body.total, 0);
  });

  it('treats regex characters in the search as plain text', async () => {
    const res = await api('GET', '/users?search=.*', { token: me.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 0);
  });

  it('respects the limit but reports the total', async () => {
    const res = await api('GET', '/users?limit=1', { token: me.token });
    assert.equal(res.body.students.length, 1);
    assert.equal(res.body.total, 3);
  });

  it('sorts A-Z with ?sort=name and falls back to best match for unknown values', async () => {
    const byName = await api('GET', '/users?sort=name', { token: me.token });
    assert.deepEqual(byName.body.students.map((s) => s.name), ['Carl Cook', 'Cody Coder', 'Gita Guitar']);
    const unknown = await api('GET', '/users?sort=bogus', { token: me.token });
    assert.deepEqual(unknown.body.students.map((s) => s.name), ['Gita Guitar', 'Carl Cook', 'Cody Coder']);
  });

  it('recommends only students who teach what I want to learn', async () => {
    const res = await api('GET', '/users/recommended', { token: me.token });
    assert.deepEqual(res.body.students.map((s) => s.name), ['Gita Guitar', 'Carl Cook']);
    assert.deepEqual(res.body.students[0].match.theyCanTeachMe, ['Guitar']);
    assert.deepEqual(res.body.students[0].match.iCanTeachThem, ['Python']);
  });

  it('returns a public profile, and 404s for bad or unknown ids', async () => {
    const ok = await api('GET', `/users/${guitarist.user.id}`, { token: me.token });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.student.name, 'Gita Guitar');
    assert.equal(ok.body.student.email, undefined);
    assert.equal((await api('GET', '/users/not-an-id', { token: me.token })).status, 404);
    assert.equal((await api('GET', '/users/aaaaaaaaaaaaaaaaaaaaaaaa', { token: me.token })).status, 404);
  });
});

describe('registration email domain restriction', () => {
  before(resetDb);

  it('rejects an email whose domain is not on the allowed list', async () => {
    const res = await api('POST', '/auth/register', { body: { name: 'X', email: 'x@gmail.com', password: 'password123', university: 'UoH', department: 'CS' } });
    assert.equal(res.status, 400);
    assert.match(res.body.errors.email, /university email/i);
  });

  it('accepts an allowed domain and can log straight back in (no email verification step)', async () => {
    const email = 'verify.me@uohyd.ac.in';
    const ok = await api('POST', '/auth/register', { body: { name: 'Vera', email, password: 'password123', university: 'UoH', department: 'CS' } });
    assert.equal(ok.status, 201);

    const login = await api('POST', '/auth/login', { body: { email, password: 'password123' } });
    assert.equal(login.status, 200);
  });
});
