import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { after, before, describe, it } from 'node:test';
import { api, createClass, JAAS, makeInstructor, minutesFromNow, registerUser, resetDb, Session, startTestServer, stopTestServer, User } from './helpers.js';

before(startTestServer);
after(stopTestServer);

const body = (overrides = {}) => ({ title: 'Python basics', skill: 'Python', startsAt: minutesFromNow(120), durationMinutes: 60, capacity: 10, ...overrides });

describe('scheduling classes', () => {
  let host, student;
  before(async () => {
    await resetDb();
    host = await registerUser({ name: 'Hana Host' });
    await makeInstructor(host.user.id);
    student = await registerUser({ name: 'Stu Dent' });
  });

  it('only verified instructors can schedule', async () => {
    assert.equal((await api('POST', '/sessions', { token: student.token, body: body() })).status, 403);
    assert.equal((await api('POST', '/sessions', { body: body() })).status, 401);
  });

  it('validates every field', async () => {
    const bad = {
      title: 'ab', skill: '', startsAt: minutesFromNow(1), durationMinutes: 5, capacity: 0,
    };
    const res = await api('POST', '/sessions', { token: host.token, body: bad });
    assert.equal(res.status, 400);
    assert.deepEqual(Object.keys(res.body.errors).sort(), ['capacity', 'durationMinutes', 'skill', 'startsAt', 'title']);
    assert.match(res.body.errors.title, /at least 3/);
    assert.equal((await api('POST', '/sessions', { token: host.token, body: body({ startsAt: 'not a date' }) })).status, 400);
    assert.equal((await api('POST', '/sessions', { token: host.token, body: body({ startsAt: minutesFromNow(60 * 24 * 400) }) })).status, 400);
    assert.equal((await api('POST', '/sessions', { token: host.token, body: body({ capacity: 1.5 }) })).status, 400);
    assert.equal((await api('POST', '/sessions', { token: host.token, body: body({ description: 'x'.repeat(501) }) })).status, 400);
  });

  it('can only schedule a class in a skill it actually teaches', async () => {
    const res = await api('POST', '/sessions', { token: host.token, body: body({ skill: 'Flying' }) });
    assert.equal(res.status, 400);
    assert.match(res.body.errors.skill, /own profile/i);

    // Case-insensitive, and stored using the exact spelling/casing from the instructor's profile.
    const ok = await api('POST', '/sessions', { token: host.token, body: body({ skill: 'PYTHON', startsAt: minutesFromNow(500) }) });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.session.skill, 'Python');
  });

  it('creates a class hosted by the caller, and refuses overlapping classes', async () => {
    const res = await api('POST', '/sessions', { token: host.token, body: body({ startsAt: minutesFromNow(600) }) });
    assert.equal(res.status, 201);
    const s = res.body.session;
    assert.equal(s.isHost, true);
    assert.equal(s.instructor.name, 'Hana Host');
    assert.equal(s.attendeeCount, 0);
    assert.equal(s.spotsLeft, 10);
    assert.equal(s.phase, 'upcoming');
    assert.deepEqual(s.attendees, []);
    assert.equal(JSON.stringify(res.body).includes('roomId'), false, 'the room name is never exposed in listings');

    const clash = await api('POST', '/sessions', { token: host.token, body: body({ startsAt: minutesFromNow(630) }) });
    assert.equal(clash.status, 409);
    assert.ok(clash.body.errors.startsAt);
    const adjacent = await api('POST', '/sessions', { token: host.token, body: body({ startsAt: minutesFromNow(660) }) });
    assert.equal(adjacent.status, 201, 'back-to-back classes are fine');
  });
});

describe('browsing, joining and leaving', () => {
  let host, other, s1, s2;
  const students = [];
  before(async () => {
    await resetDb();
    host = await registerUser({ name: 'Hana Host' });
    other = await registerUser({ name: 'Otto Other' });
    await makeInstructor(host.user.id, 'Experienced tutor', ['Python', 'Guitar', 'Statistics']);
    await makeInstructor(other.user.id);
    for (let i = 0; i < 5; i++) students.push(await registerUser({ name: `Student ${i}` }));
    s1 = await createClass(host.token, { title: 'Guitar for beginners', skill: 'Guitar', startsAt: minutesFromNow(300), capacity: 2 });
    s2 = await createClass(host.token, { title: 'Statistics 101', skill: 'Statistics', startsAt: minutesFromNow(900), capacity: 5 });
  });

  it('browse lists other hosts\' classes, soonest first, and hides your own', async () => {
    const res = await api('GET', '/sessions', { token: students[0].token });
    assert.deepEqual(res.body.sessions.map((s) => s.title), ['Guitar for beginners', 'Statistics 101']);
    assert.equal((await api('GET', '/sessions', { token: host.token })).body.sessions.length, 0, 'the host does not browse their own classes');
  });

  it('searches by title or skill and filters by instructor', async () => {
    assert.deepEqual((await api('GET', '/sessions?q=guit', { token: students[0].token })).body.sessions.map((s) => s.title), ['Guitar for beginners']);
    assert.deepEqual((await api('GET', '/sessions?q=statis', { token: students[0].token })).body.sessions.map((s) => s.title), ['Statistics 101']);
    assert.equal((await api('GET', '/sessions?q=.*', { token: students[0].token })).body.sessions.length, 0, 'regex characters are literal');
    assert.equal((await api('GET', `/sessions?instructor=${host.user.id}`, { token: students[0].token })).body.sessions.length, 2);
    assert.equal((await api('GET', `/sessions?instructor=${other.user.id}`, { token: students[0].token })).body.sessions.length, 0);
  });

  it('joining adds you, reduces spots, and shows up under "joined"', async () => {
    const res = await api('POST', `/sessions/${s1.id}/join`, { token: students[0].token });
    assert.equal(res.status, 200);
    assert.equal(res.body.session.joined, true);
    assert.equal(res.body.session.attendeeCount, 1);
    assert.equal(res.body.session.spotsLeft, 1);
    assert.equal(res.body.session.attendees, undefined, 'students never see who else joined');

    const joined = await api('GET', '/sessions?view=joined', { token: students[0].token });
    assert.deepEqual(joined.body.sessions.map((s) => s.id), [s1.id]);
  });

  it('rejects double-joins, hosts joining themselves, and unknown classes', async () => {
    assert.equal((await api('POST', `/sessions/${s1.id}/join`, { token: students[0].token })).status, 409);
    assert.equal((await api('POST', `/sessions/${s1.id}/join`, { token: host.token })).status, 400);
    assert.equal((await api('POST', '/sessions/not-an-id/join', { token: students[0].token })).status, 404);
    assert.equal((await api('POST', '/sessions/aaaaaaaaaaaaaaaaaaaaaaaa/join', { token: students[0].token })).status, 404);
  });

  it('never overbooks: simultaneous joins for the last seats let exactly `capacity` through', async () => {
    const racers = students.slice(1);
    const results = await Promise.all(racers.map((s) => api('POST', `/sessions/${s2.id}/join`, { token: s.token })));
    // s2 has 5 seats and 4 racers -> all fit. Now race 5 more for a 2-seat class that already has 1.
    assert.ok(results.every((r) => r.status === 200));
    const tight = await Promise.all(students.slice(1).map((s) => api('POST', `/sessions/${s1.id}/join`, { token: s.token })));
    assert.equal(tight.filter((r) => r.status === 200).length, 1, 'only one seat was left');
    assert.ok(tight.filter((r) => r.status === 409).every((r) => /full/i.test(r.body.message)));
    const fresh = await api('GET', `/sessions/${s1.id}`, { token: host.token });
    assert.equal(fresh.body.session.attendeeCount, 2);
    assert.equal(fresh.body.session.spotsLeft, 0);
  });

  it('only the host sees the attendee list', async () => {
    const asHost = await api('GET', `/sessions/${s1.id}`, { token: host.token });
    assert.equal(asHost.body.session.attendees.length, 2);
    assert.ok(asHost.body.session.attendees[0].name);
    const asStudent = await api('GET', `/sessions/${s1.id}`, { token: students[0].token });
    assert.equal(asStudent.body.session.attendees, undefined);
    assert.equal((await api('GET', '/sessions?view=hosting', { token: host.token })).body.sessions[0].attendees.length, 2);
  });

  it('leaving frees a seat; leaving twice is refused', async () => {
    const res = await api('DELETE', `/sessions/${s1.id}/join`, { token: students[0].token });
    assert.equal(res.status, 200);
    assert.equal(res.body.session.joined, false);
    assert.equal(res.body.session.spotsLeft, 1);
    assert.equal((await api('DELETE', `/sessions/${s1.id}/join`, { token: students[0].token })).status, 409);
  });

  it('only verified instructors have a hosting view', async () => {
    assert.equal((await api('GET', '/sessions?view=hosting', { token: students[0].token })).status, 403);
    assert.equal((await api('GET', '/sessions?view=hosting', { token: host.token })).body.sessions.length, 2);
  });

  it('only the host can cancel; cancelled classes cannot be joined and show as cancelled to attendees', async () => {
    const attendee = students[0];
    await api('POST', `/sessions/${s2.id}/join`, { token: attendee.token }).catch(() => {});
    assert.equal((await api('POST', `/sessions/${s2.id}/cancel`, { token: attendee.token })).status, 403);
    assert.equal((await api('POST', `/sessions/${s2.id}/cancel`, { token: other.token })).status, 403);

    const res = await api('POST', `/sessions/${s2.id}/cancel`, { token: host.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.session.status, 'cancelled');
    assert.equal(res.body.session.phase, 'cancelled');
    assert.equal((await api('POST', `/sessions/${s2.id}/cancel`, { token: host.token })).status, 409);

    const late = await registerUser();
    const join = await api('POST', `/sessions/${s2.id}/join`, { token: late.token });
    assert.equal(join.status, 409);
    assert.match(join.body.message, /cancelled/i);
    assert.equal((await api('GET', '/sessions', { token: late.token })).body.sessions.some((s) => s.id === s2.id), false, 'cancelled classes leave the browse list');
  });

  it('a class that has already ended cannot be joined or left', async () => {
    const past = await Session.create({
      instructor: host.user.id, title: 'Old class', skill: 'Python', startsAt: new Date(Date.now() - 3 * 3_600_000), durationMinutes: 60,
      endsAt: new Date(Date.now() - 2 * 3_600_000), capacity: 5, attendees: [students[0].user.id], roomId: 'skillswap-oldroom',
    });
    const join = await api('POST', `/sessions/${past._id}/join`, { token: students[1].token });
    assert.equal(join.status, 409);
    assert.match(join.body.message, /ended/i);
    assert.equal((await api('DELETE', `/sessions/${past._id}/join`, { token: students[0].token })).status, 409);
    assert.equal((await api('GET', `/sessions/${past._id}`, { token: students[0].token })).body.session.phase, 'ended');
  });
});

describe('video rooms', () => {
  let host, student, outsider, soon, later;
  before(async () => {
    await resetDb();
    host = await registerUser({ name: 'Hana Host' });
    await makeInstructor(host.user.id);
    student = await registerUser({ name: 'Stu Dent', email: 'stu.private@example.com' });
    outsider = await registerUser({ name: 'Out Sider' });
    soon = await createClass(host.token, { title: 'Starting soon', startsAt: minutesFromNow(10) });
    later = await createClass(host.token, { title: 'Tomorrow', startsAt: minutesFromNow(60 * 24) });
    await api('POST', `/sessions/${soon.id}/join`, { token: student.token });
    await api('POST', `/sessions/${later.id}/join`, { token: student.token });
  });

  it('only the host and joined students may enter', async () => {
    const res = await api('GET', `/sessions/${soon.id}/room`, { token: outsider.token });
    assert.equal(res.status, 403);
    assert.equal(JSON.stringify(res.body).includes('skillswap-'), false);
    assert.equal((await api('GET', `/sessions/${soon.id}/room`)).status, 401);
    assert.equal((await api('GET', '/sessions/not-an-id/room', { token: host.token })).status, 404);
  });

  it('is closed until shortly before the start, and says when it opens', async () => {
    const res = await api('GET', `/sessions/${later.id}/room`, { token: student.token });
    assert.equal(res.status, 409);
    assert.match(res.body.message, /not open yet/i);
    assert.ok(new Date(res.body.opensAt) > new Date());
    assert.equal((await api('GET', `/sessions/${later.id}/room`, { token: host.token })).status, 409, 'the host waits too');
  });

  it('opens 15 minutes before the start with a properly signed per-person token', async () => {
    const res = await api('GET', `/sessions/${soon.id}/room`, { token: student.token });
    assert.equal(res.status, 200);
    const { room } = res.body;
    assert.equal(room.domain, '8x8.vc');
    assert.equal(room.appId, JAAS.appId);
    assert.ok(room.roomName.startsWith(`${JAAS.appId}/skillswap-`));
    assert.equal(room.moderator, false);

    // Verify the signature with the public key, exactly as JaaS would.
    const decoded = jwt.verify(room.jwt, JAAS.publicKey, { algorithms: ['RS256'], complete: true });
    assert.equal(decoded.header.kid, `${JAAS.appId}/${JAAS.keyId}`);
    assert.equal(decoded.header.typ, 'JWT');
    const p = decoded.payload;
    assert.equal(p.aud, 'jitsi');
    assert.equal(p.iss, 'chat');
    assert.equal(p.sub, JAAS.appId);
    assert.equal(p.room, room.roomName.split('/')[1], 'the token is only valid for this one room');
    assert.equal(p.context.user.moderator, 'false');
    assert.equal(p.context.user.name, 'Stu Dent');
    assert.equal(p.context.user.email, undefined, 'emails stay private');
    assert.equal(JSON.stringify(p).includes('stu.private'), false);
    assert.equal(p.context.features.recording, false);
    assert.ok(p.exp > Date.now() / 1000 && p.exp - p.nbf < 7 * 3600, 'short-lived');
  });

  it('makes only the host a moderator, in the same room', async () => {
    const studentRoom = (await api('GET', `/sessions/${soon.id}/room`, { token: student.token })).body.room;
    const hostRoom = (await api('GET', `/sessions/${soon.id}/room`, { token: host.token })).body.room;
    assert.equal(hostRoom.moderator, true);
    assert.equal(hostRoom.roomName, studentRoom.roomName);
    assert.equal(jwt.verify(hostRoom.jwt, JAAS.publicKey).context.user.moderator, 'true');
    assert.notEqual(hostRoom.jwt, studentRoom.jwt);
  });

  it('refuses cancelled, ended, and unverified-host rooms', async () => {
    const cancelled = await createClass(host.token, { title: 'Cancelled', startsAt: minutesFromNow(400) });
    await api('POST', `/sessions/${cancelled.id}/join`, { token: student.token });
    await api('POST', `/sessions/${cancelled.id}/cancel`, { token: host.token });
    const c = await api('GET', `/sessions/${cancelled.id}/room`, { token: student.token });
    assert.equal(c.status, 409);
    assert.match(c.body.message, /cancelled/i);

    const ended = await Session.create({
      instructor: host.user.id, title: 'Ended', skill: 'Python', startsAt: new Date(Date.now() - 5 * 3_600_000), durationMinutes: 60,
      endsAt: new Date(Date.now() - 4 * 3_600_000), capacity: 5, attendees: [student.user.id], roomId: 'skillswap-endedroom',
    });
    const e = await api('GET', `/sessions/${ended._id}/room`, { token: student.token });
    assert.equal(e.status, 409);
    assert.match(e.body.message, /ended/i);

    await User.updateOne({ _id: host.user.id }, { 'instructor.status': 'rejected' });
    assert.equal((await api('GET', `/sessions/${soon.id}/room`, { token: host.token })).status, 403);
    await makeInstructor(host.user.id);
  });

  it('reports a clear error when video has not been configured on the server', async () => {
    const saved = { ...JAAS_ENV() };
    delete process.env.JAAS_APP_ID;
    try {
      const res = await api('GET', `/sessions/${soon.id}/room`, { token: student.token });
      assert.equal(res.status, 503);
      assert.match(res.body.message, /not set up/i);
      // Everything else still works without video.
      assert.equal((await api('GET', '/sessions', { token: student.token })).status, 200);
    } finally {
      Object.assign(process.env, saved);
    }
  });
});

function JAAS_ENV() {
  return { JAAS_APP_ID: process.env.JAAS_APP_ID, JAAS_KEY_ID: process.env.JAAS_KEY_ID, JAAS_PRIVATE_KEY: process.env.JAAS_PRIVATE_KEY };
}
