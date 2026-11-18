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
    assert.equal(res.body.user.emailVerified, false, 'not verified yet, but the first session is still granted');
    assert.equal(JSON.stringify(res.body).includes('password'), false);

    const stored = await User.findOne({ email: 'ada@example.com' }).select('+passwordHash');
    assert.ok(stored.passwordHash.startsWith('$2'), 'password should be a bcrypt hash');
    assert.notEqual(stored.passwordHash, 'password123');

    // The later tests in this file log Ada back in with a fresh password-only request, so mark her
    // verified here; the "email verification" describe block below tests the unverified path itself.
    await User.updateOne({ email: 'ada@example.com' }, { emailVerified: true });
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
    for (const [method, path] of [['GET', '/auth/me'], ['PUT', '/users/me'], ['GET', '/users'], ['GET', '/users/recommended'], ['GET', '/requests'], ['POST', '/requests']]) {
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

describe('exchange requests', () => {
  let alice, bob, carol;
  const send = (token, body) => api('POST', '/requests', { token, body });

  before(async () => {
    await resetDb();
    alice = await registerUser({ name: 'Alice' });
    bob = await registerUser({ name: 'Bob' });
    carol = await registerUser({ name: 'Carol' });
    await setSkills(alice.token, [skill('Python')], [skill('Guitar')]);
    await setSkills(bob.token, [skill('Guitar'), skill('Chess')], [skill('Python')]);
    await setSkills(carol.token, [skill('Cooking')], []);
  });

  it('creates a pending request using the canonical skill names', async () => {
    const res = await send(alice.token, { recipientId: bob.user.id, skillWanted: ' guitar ', skillOffered: 'PYTHON', message: 'Hi Bob!' });
    assert.equal(res.status, 201);
    assert.equal(res.body.request.status, 'pending');
    assert.equal(res.body.request.skillWanted, 'Guitar');
    assert.equal(res.body.request.skillOffered, 'Python');
    assert.equal(res.body.request.requester.name, 'Alice');
    assert.equal(res.body.request.recipient.email, undefined, 'email stays private while pending');
  });

  it('prevents sending a request to yourself', async () => {
    const res = await send(alice.token, { recipientId: alice.user.id, skillWanted: 'Python', skillOffered: 'Python' });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /yourself/i);
  });

  it('rejects invalid input', async () => {
    assert.equal((await send(alice.token, {})).status, 400);
    assert.equal((await send(alice.token, { recipientId: 'nope', skillWanted: 'x', skillOffered: 'y' })).status, 400);
    assert.equal((await send(alice.token, { recipientId: bob.user.id, skillWanted: 'Guitar', skillOffered: 'Python', message: 'x'.repeat(501) })).status, 400);
    assert.equal((await send(alice.token, { recipientId: 'aaaaaaaaaaaaaaaaaaaaaaaa', skillWanted: 'Guitar', skillOffered: 'Python' })).status, 404);
  });

  it("requires the skills to exist on the right profiles", async () => {
    const notTaught = await send(alice.token, { recipientId: bob.user.id, skillWanted: 'Cooking', skillOffered: 'Python' });
    assert.equal(notTaught.status, 400);
    assert.ok(notTaught.body.errors.skillWanted);
    const notOffered = await send(alice.token, { recipientId: bob.user.id, skillWanted: 'Chess', skillOffered: 'Juggling' });
    assert.equal(notOffered.status, 400);
    assert.ok(notOffered.body.errors.skillOffered);
  });

  it('blocks duplicate pending requests but allows a different skill pair', async () => {
    const dupe = await send(alice.token, { recipientId: bob.user.id, skillWanted: 'Guitar', skillOffered: 'Python' });
    assert.equal(dupe.status, 409);
    const different = await send(alice.token, { recipientId: bob.user.id, skillWanted: 'Chess', skillOffered: 'Python' });
    assert.equal(different.status, 201);
  });

  it('lists incoming and outgoing requests for each side', async () => {
    const aliceView = await api('GET', '/requests', { token: alice.token });
    assert.equal(aliceView.body.outgoing.length, 2);
    assert.equal(aliceView.body.incoming.length, 0);
    const bobView = await api('GET', '/requests', { token: bob.token });
    assert.equal(bobView.body.incoming.length, 2);
    assert.equal(bobView.body.outgoing.length, 0);
    const carolView = await api('GET', '/requests', { token: carol.token });
    assert.equal(carolView.body.incoming.length + carolView.body.outgoing.length, 0);
  });

  it('only lets the recipient accept or reject', async () => {
    const { body } = await api('GET', '/requests', { token: bob.token });
    const id = body.incoming[0].id;

    assert.equal((await api('PATCH', `/requests/${id}`, { token: alice.token, body: { status: 'accepted' } })).status, 403, 'requester cannot respond');
    assert.equal((await api('PATCH', `/requests/${id}`, { token: carol.token, body: { status: 'accepted' } })).status, 404, 'outsider cannot see it');
    assert.equal((await api('PATCH', `/requests/${id}`, { token: bob.token, body: { status: 'pending' } })).status, 400);
    assert.equal((await api('PATCH', `/requests/${id}`, { token: bob.token, body: { status: 'cancelled' } })).status, 400);
    assert.equal((await api('PATCH', '/requests/not-an-id', { token: bob.token, body: { status: 'accepted' } })).status, 404);
  });

  it('accepts a request, shares emails with both sides, and is final', async () => {
    const { body } = await api('GET', '/requests', { token: bob.token });
    const [first, second] = body.incoming;

    const accepted = await api('PATCH', `/requests/${first.id}`, { token: bob.token, body: { status: 'accepted' } });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.request.status, 'accepted');
    assert.equal(accepted.body.request.requester.email, alice.email);

    const aliceView = await api('GET', '/requests', { token: alice.token });
    const mine = aliceView.body.outgoing.find((r) => r.id === first.id);
    assert.equal(mine.status, 'accepted');
    assert.equal(mine.recipient.email, bob.email);

    // cannot flip an already-answered request
    assert.equal((await api('PATCH', `/requests/${first.id}`, { token: bob.token, body: { status: 'rejected' } })).status, 409);

    // rejecting the other one: no emails are shared
    const rejected = await api('PATCH', `/requests/${second.id}`, { token: bob.token, body: { status: 'rejected' } });
    assert.equal(rejected.status, 200);
    assert.equal(rejected.body.request.status, 'rejected');
    assert.equal(rejected.body.request.requester.email, undefined);
  });

  it('allows a new request for the same skills once the earlier one is no longer pending', async () => {
    const res = await send(alice.token, { recipientId: bob.user.id, skillWanted: 'Chess', skillOffered: 'Python' });
    assert.equal(res.status, 201);
  });
});

describe('requests from a student with no skills to offer', () => {
  let newbie, bob;
  before(async () => {
    await resetDb();
    newbie = await registerUser({ name: 'Newbie' }); // never calls setSkills: skillsOffered stays []
    bob = await registerUser({ name: 'Bob' });
    await setSkills(bob.token, [skill('Guitar')], []);
  });

  it('can send a request without offering anything back', async () => {
    const res = await api('POST', '/requests', { token: newbie.token, body: { recipientId: bob.user.id, skillWanted: 'Guitar', message: 'Please teach me!' } });
    assert.equal(res.status, 201);
    assert.equal(res.body.request.skillWanted, 'Guitar');
    assert.equal(res.body.request.skillOffered, '');
  });

  it('still cannot offer a skill it does not have', async () => {
    const res = await api('POST', '/requests', { token: newbie.token, body: { recipientId: bob.user.id, skillWanted: 'Guitar', skillOffered: 'Python' } });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.skillOffered);
  });

  it('a duplicate pending request with no skill offered is still blocked', async () => {
    const dupe = await api('POST', '/requests', { token: newbie.token, body: { recipientId: bob.user.id, skillWanted: 'Guitar' } });
    assert.equal(dupe.status, 409);
  });

  it('the recipient sees it as a plain request to learn, and can still accept it', async () => {
    const { body } = await api('GET', '/requests', { token: bob.token });
    assert.equal(body.incoming[0].skillOffered, '');
    const accepted = await api('PATCH', `/requests/${body.incoming[0].id}`, { token: bob.token, body: { status: 'accepted' } });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.request.requester.email, newbie.email);
  });
});

describe('email verification', () => {
  const email = 'verify.me@uohyd.ac.in';
  before(resetDb);

  it('registering only restricts the email domain; any domain name shape still needs verifying', async () => {
    const wrongDomain = await api('POST', '/auth/register', { body: { name: 'X', email: 'x@gmail.com', password: 'password123', university: 'UoH', department: 'CS' } });
    assert.equal(wrongDomain.status, 400);
    assert.match(wrongDomain.body.errors.email, /university email/i);

    const ok = await api('POST', '/auth/register', { body: { name: 'Vera', email, password: 'password123', university: 'UoH', department: 'CS' } });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.user.emailVerified, false);
  });

  it('cannot log back in until the email is verified', async () => {
    const res = await api('POST', '/auth/login', { body: { email, password: 'password123' } });
    assert.equal(res.status, 403);
    assert.equal(res.body.emailNotVerified, true);
  });

  it('rejects a garbage or expired token', async () => {
    assert.equal((await api('POST', '/auth/verify-email', { body: { token: 'not-a-real-token' } })).status, 400);
    await User.updateOne({ email }, { emailVerificationExpires: new Date(Date.now() - 1000) });
    const { emailVerificationToken } = await User.findOne({ email }).select('+emailVerificationToken');
    const expired = await api('POST', '/auth/verify-email', { body: { token: emailVerificationToken } });
    assert.equal(expired.status, 400);
    assert.match(expired.body.message, /expired/i);
  });

  it('resend-verification always replies the same way, whether the email is unknown, already verified, or real', async () => {
    const unknown = await api('POST', '/auth/resend-verification', { body: { email: 'nobody@uohyd.ac.in' } });
    const real = await api('POST', '/auth/resend-verification', { body: { email } });
    assert.equal(unknown.status, 200);
    assert.deepEqual(unknown.body, real.body, 'the response must not reveal which emails are registered');
  });

  it('verifying with a fresh token logs the user in and the account works from then on', async () => {
    const { emailVerificationToken } = await User.findOne({ email }).select('+emailVerificationToken');
    const res = await api('POST', '/auth/verify-email', { body: { token: emailVerificationToken } });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.emailVerified, true);

    const login = await api('POST', '/auth/login', { body: { email, password: 'password123' } });
    assert.equal(login.status, 200);

    // Already verified: resending must not hand out a usable token for a second verify.
    const afterVerified = await api('POST', '/auth/resend-verification', { body: { email } });
    assert.equal(afterVerified.status, 200);
    const stillGone = await User.findOne({ email }).select('+emailVerificationToken');
    assert.equal(stillGone.emailVerificationToken, undefined);
  });
});
