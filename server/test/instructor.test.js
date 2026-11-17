import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { api, createClass, makeAdmin, makeInstructor, registerUser, resetDb, setSkills, startTestServer, stopTestServer, User } from './helpers.js';

before(startTestServer);
after(stopTestServer);

const skill = (name) => ({ name, level: 'advanced' });
const application = { headline: 'Python and data tutor', experience: 'I have tutored first-year students in Python for two years and TA-ed a data structures course.' };
const apply = (token, body = application) => api('POST', '/instructor/apply', { token, body });

describe('instructor verification workflow', () => {
  let admin, student, other;
  before(async () => {
    await resetDb();
    admin = await registerUser({ name: 'Admin Person' });
    await makeAdmin(admin.user.id);
    student = await registerUser({ name: 'Sam Student' });
    other = await registerUser({ name: 'Olive Other' });
  });

  it('starts everyone as a plain student; role and instructor fields cannot be self-assigned', async () => {
    const res = await api('POST', '/auth/register', {
      body: { name: 'Sneaky', email: 'sneaky@example.com', password: 'password123', university: 'UoH', department: 'CS', role: 'admin', mode: 'instructor', instructor: { status: 'verified' } },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'user');
    assert.equal(res.body.user.mode, 'student');
    assert.equal(res.body.user.instructor.status, 'none');
    assert.equal(res.body.user.isInstructor, false);

    const put = await api('PUT', '/users/me', { token: res.body.token, body: { role: 'admin', instructor: { status: 'verified' }, bio: 'hi' } });
    assert.equal(put.body.user.role, 'user');
    assert.equal(put.body.user.instructor.status, 'none');
  });

  it('requires a teachable skill and a valid application before applying', async () => {
    const noSkills = await apply(student.token);
    assert.equal(noSkills.status, 400);
    await setSkills(student.token, [skill('Python')], []);

    const short = await apply(student.token, { headline: 'abc', experience: 'too short' });
    assert.equal(short.status, 400);
    assert.match(short.body.errors.headline, /at least 5/);
    assert.ok(short.body.errors.experience);
    assert.equal((await apply(student.token, {})).status, 400);
  });

  it('applying makes the application pending, and it cannot be submitted twice', async () => {
    const res = await apply(student.token);
    assert.equal(res.status, 200);
    assert.equal(res.body.user.instructor.status, 'pending');
    assert.equal(res.body.user.isInstructor, false, 'not an instructor until an admin approves');
    assert.equal((await apply(student.token)).status, 409);
  });

  it('a pending applicant cannot host classes or switch to instructor mode', async () => {
    const mode = await api('PUT', '/users/me/mode', { token: student.token, body: { mode: 'instructor' } });
    assert.equal(mode.status, 403);
    const create = await api('POST', '/sessions', { token: student.token, body: { title: 'Nope', skill: 'Python', startsAt: new Date(Date.now() + 3_600_000).toISOString() } });
    assert.equal(create.status, 403);
  });

  it('only admins can use the admin endpoints', async () => {
    assert.equal((await api('GET', '/admin/instructors', { token: student.token })).status, 403);
    assert.equal((await api('PATCH', `/admin/instructors/${student.user.id}`, { token: student.token, body: { decision: 'approve' } })).status, 403);
    assert.equal((await api('GET', '/admin/instructors')).status, 401);
  });

  it('lists applications by status with counts, including the identity details an admin needs', async () => {
    const res = await api('GET', '/admin/instructors?status=pending', { token: admin.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.applications.length, 1);
    const [app] = res.body.applications;
    assert.equal(app.name, 'Sam Student');
    assert.equal(app.email, student.email);
    assert.equal(app.headline, application.headline);
    assert.deepEqual(res.body.counts, { pending: 1, verified: 0, rejected: 0 });
  });

  it('rejecting needs a reason; the applicant sees it and can reapply', async () => {
    const noNote = await api('PATCH', `/admin/instructors/${student.user.id}`, { token: admin.token, body: { decision: 'reject' } });
    assert.equal(noNote.status, 400);
    assert.ok(noNote.body.errors.note);

    const rejected = await api('PATCH', `/admin/instructors/${student.user.id}`, { token: admin.token, body: { decision: 'reject', note: 'Please add teaching experience.' } });
    assert.equal(rejected.status, 200);
    assert.equal(rejected.body.application.status, 'rejected');

    const me = await api('GET', '/auth/me', { token: student.token });
    assert.equal(me.body.user.instructor.status, 'rejected');
    assert.equal(me.body.user.instructor.reviewNote, 'Please add teaching experience.');

    assert.equal((await apply(student.token)).body.user.instructor.status, 'pending', 'rejected applicants can apply again');
  });

  it('an admin cannot review their own application', async () => {
    await setSkills(admin.token, [skill('Maths')], []);
    assert.equal((await apply(admin.token)).status, 200);
    const res = await api('PATCH', `/admin/instructors/${admin.user.id}`, { token: admin.token, body: { decision: 'approve' } });
    assert.equal(res.status, 403);
  });

  it('approving verifies the instructor, shows a public badge, and rejects invalid transitions', async () => {
    assert.equal((await api('PATCH', `/admin/instructors/${other.user.id}`, { token: admin.token, body: { decision: 'approve' } })).status, 409, 'cannot approve someone who never applied');
    assert.equal((await api('PATCH', '/admin/instructors/not-an-id', { token: admin.token, body: { decision: 'approve' } })).status, 404);

    const res = await api('PATCH', `/admin/instructors/${student.user.id}`, { token: admin.token, body: { decision: 'approve' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.application.status, 'verified');
    assert.equal((await api('PATCH', `/admin/instructors/${student.user.id}`, { token: admin.token, body: { decision: 'approve' } })).status, 409, 'cannot approve twice');

    const asOther = await api('GET', `/users/${student.user.id}`, { token: other.token });
    assert.equal(asOther.body.student.isInstructor, true);
    assert.equal(asOther.body.student.instructorHeadline, application.headline);
    assert.equal(asOther.body.student.email, undefined);
    assert.equal(asOther.body.student.instructor, undefined, 'the application text stays private');
  });

  it('a verified instructor can switch between student and instructor mode, and it persists', async () => {
    const toInstructor = await api('PUT', '/users/me/mode', { token: student.token, body: { mode: 'instructor' } });
    assert.equal(toInstructor.status, 200);
    assert.equal(toInstructor.body.user.mode, 'instructor');
    assert.equal((await api('GET', '/auth/me', { token: student.token })).body.user.mode, 'instructor');

    const back = await api('PUT', '/users/me/mode', { token: student.token, body: { mode: 'student' } });
    assert.equal(back.body.user.mode, 'student');
    assert.equal((await api('PUT', '/users/me/mode', { token: student.token, body: { mode: 'admin' } })).status, 400);
    assert.equal((await api('PUT', '/users/me/mode', { token: other.token, body: { mode: 'instructor' } })).status, 403);
  });

  it('revoking needs a reason, drops instructor mode and cancels upcoming classes', async () => {
    await api('PUT', '/users/me/mode', { token: student.token, body: { mode: 'instructor' } });
    const cls = await createClass(student.token);

    assert.equal((await api('PATCH', `/admin/instructors/${student.user.id}`, { token: admin.token, body: { decision: 'revoke' } })).status, 400);
    const res = await api('PATCH', `/admin/instructors/${student.user.id}`, { token: admin.token, body: { decision: 'revoke', note: 'Policy violation.' } });
    assert.equal(res.status, 200);

    const me = await api('GET', '/auth/me', { token: student.token });
    assert.equal(me.body.user.mode, 'student');
    assert.equal(me.body.user.isInstructor, false);
    assert.equal((await api('GET', `/sessions/${cls.id}`, { token: other.token })).body.session.status, 'cancelled');
    assert.equal((await api('POST', '/sessions', { token: student.token, body: {} })).status, 403);
  });

  it('works for accounts created before roles existed (no instructor/role fields at all)', async () => {
    const legacy = await registerUser({ name: 'Legacy Lee' });
    await User.collection.updateOne({ email: legacy.email }, { $unset: { role: '', mode: '', instructor: '' } });
    const me = await api('GET', '/auth/me', { token: legacy.token });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.role, 'user');
    assert.equal(me.body.user.instructor.status, 'none');
    const list = await api('GET', '/users', { token: other.token });
    assert.equal(list.status, 200);
    assert.equal(list.body.students.find((s) => s.name === 'Legacy Lee').isInstructor, false);
    await makeInstructor(legacy.user.id);
  });
});
