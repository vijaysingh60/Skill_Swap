import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { api, createClass, makeInstructor, Payment, registerUser, resetDb, startTestServer, stopTestServer } from './helpers.js';

before(startTestServer);
after(stopTestServer);

// This exercises the MOCK payment flow (sessions.controller.js: payForSession). No real gateway or
// money is involved — see models/Payment.js for why, and how a real one would plug in instead.
describe('paying for a class', () => {
  let host, student, freeClass, paidClass;
  before(async () => {
    await resetDb();
    host = await registerUser({ name: 'Hana Host' });
    await makeInstructor(host.user.id);
    student = await registerUser({ name: 'Stu Dent' });
    freeClass = await createClass(host.token, { title: 'Free class' });
    paidClass = await createClass(host.token, { title: 'Paid class', startsAt: new Date(Date.now() + 3 * 3_600_000).toISOString(), price: 499 });
  });

  it('defaults to free, and reports the price to everyone', async () => {
    assert.equal(freeClass.price, 0);
    assert.equal(freeClass.paidByMe, false);
    assert.equal(paidClass.price, 499);
    assert.equal(paidClass.paidByMe, false);
  });

  it('rejects an out-of-range price when scheduling', async () => {
    const res = await api('POST', '/sessions', { token: host.token, body: { title: 'Too pricey', skill: 'Python', startsAt: new Date(Date.now() + 3_600_000).toISOString(), price: 20_000 } });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.price);
  });

  it('joining a free class never needs payment', async () => {
    const res = await api('POST', `/sessions/${freeClass.id}/join`, { token: student.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.session.joined, true);
  });

  it('joining a paid class without paying first is refused with the price', async () => {
    const res = await api('POST', `/sessions/${paidClass.id}/join`, { token: student.token });
    assert.equal(res.status, 402);
    assert.equal(res.body.price, 499);
    assert.equal((await api('GET', `/sessions/${paidClass.id}`, { token: student.token })).body.session.joined, false);
  });

  it('cannot pay for a free class, or for a class it is hosting', async () => {
    const forFree = await api('POST', `/sessions/${freeClass.id}/pay`, { token: student.token });
    assert.equal(forFree.status, 400);
    assert.match(forFree.body.message, /free/i);
    const asHost = await api('POST', `/sessions/${paidClass.id}/pay`, { token: host.token });
    assert.equal(asHost.status, 400);
  });

  it('paying records a receipt, and then join works', async () => {
    const pay = await api('POST', `/sessions/${paidClass.id}/pay`, { token: student.token });
    assert.equal(pay.status, 201);
    assert.equal(pay.body.payment.amount, 499);
    assert.equal(pay.body.payment.provider, 'mock');

    const before = await api('GET', `/sessions/${paidClass.id}`, { token: student.token });
    assert.equal(before.body.session.paidByMe, true);
    assert.equal(before.body.session.joined, false, 'paying does not join by itself');

    const join = await api('POST', `/sessions/${paidClass.id}/join`, { token: student.token });
    assert.equal(join.status, 200);
    assert.equal(join.body.session.joined, true);
    assert.equal(join.body.session.paidByMe, true);
  });

  it('paying twice does not create a second receipt or charge again', async () => {
    const again = await api('POST', `/sessions/${paidClass.id}/pay`, { token: student.token });
    assert.equal(again.status, 201);
    const count = await Payment.countDocuments({ session: paidClass.id, student: student.user.id });
    assert.equal(count, 1);
  });

  it('leaving does not refund; rejoining needs no second payment', async () => {
    const leave = await api('DELETE', `/sessions/${paidClass.id}/join`, { token: student.token });
    assert.equal(leave.status, 200);
    assert.equal(leave.body.session.paidByMe, true);

    const rejoin = await api('POST', `/sessions/${paidClass.id}/join`, { token: student.token });
    assert.equal(rejoin.status, 200, 'already paid earlier, so this does not get the 402 again');
  });

  it('cannot pay for a cancelled or already-ended class', async () => {
    const cancelled = await createClass(host.token, { title: 'Cancelled paid class', price: 100, startsAt: new Date(Date.now() + 5 * 3_600_000).toISOString() });
    await api('POST', `/sessions/${cancelled.id}/cancel`, { token: host.token });
    const res = await api('POST', `/sessions/${cancelled.id}/pay`, { token: student.token });
    assert.equal(res.status, 409);
  });
});
