import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { after, before, describe, it } from 'node:test';
import { api, connectSocket, emitAsync, JAAS, Message, registerUser, resetDb, setSkills, startTestServer, stopTestServer } from './helpers.js';

before(startTestServer);
after(stopTestServer);

const skill = (name) => ({ name, level: 'intermediate' });

describe('in-platform communication after an accepted request', () => {
  let alice, bob, carol, requestId;

  before(async () => {
    await resetDb();
    alice = await registerUser({ name: 'Alice' });
    bob = await registerUser({ name: 'Bob' });
    carol = await registerUser({ name: 'Carol' }); // an outsider: not part of the accepted request
    await setSkills(alice.token, [skill('Python')], []);
    await setSkills(bob.token, [skill('Guitar')], []);

    const sent = await api('POST', '/requests', { token: alice.token, body: { recipientId: bob.user.id, skillWanted: 'Guitar', skillOffered: 'Python' } });
    requestId = sent.body.request.id;
  });

  it('neither chat nor video is available while the request is still pending', async () => {
    assert.equal((await api('GET', `/requests/${requestId}/messages`, { token: alice.token })).status, 404);
    assert.equal((await api('GET', `/requests/${requestId}/room`, { token: alice.token })).status, 404);
  });

  it('accepting the request opens both, for the two participants only', async () => {
    const accept = await api('PATCH', `/requests/${requestId}`, { token: bob.token, body: { status: 'accepted' } });
    assert.equal(accept.status, 200);

    assert.equal((await api('GET', `/requests/${requestId}/messages`, { token: alice.token })).status, 200);
    assert.equal((await api('GET', `/requests/${requestId}/messages`, { token: bob.token })).status, 200);
    assert.equal((await api('GET', `/requests/${requestId}/messages`, { token: carol.token })).status, 404);
    assert.equal((await api('GET', '/requests/not-an-id/messages', { token: alice.token })).status, 404);
  });

  it('message history starts empty, and names the other participant for each side (even with no messages yet)', async () => {
    const asAlice = await api('GET', `/requests/${requestId}/messages`, { token: alice.token });
    assert.deepEqual(asAlice.body.messages, []);
    assert.deepEqual(asAlice.body.other, { id: bob.user.id, name: 'Bob' });

    const asBob = await api('GET', `/requests/${requestId}/messages`, { token: bob.token });
    assert.deepEqual(asBob.body.other, { id: alice.user.id, name: 'Alice' });
  });

  it('rejects a socket connection without a valid token', async () => {
    await assert.rejects(connectSocket('not-a-real-token'));
    await assert.rejects(connectSocket(''));
  });

  it('only a real participant can join the request room over the socket', async () => {
    const aliceSocket = await connectSocket(alice.token);
    const carolSocket = await connectSocket(carol.token);
    try {
      const aliceJoin = await emitAsync(aliceSocket, 'request:join', requestId);
      assert.equal(aliceJoin.ok, true);
      const carolJoin = await emitAsync(carolSocket, 'request:join', requestId);
      assert.equal(carolJoin.ok, false);
    } finally {
      aliceSocket.close();
      carolSocket.close();
    }
  });

  it('a message sent over the socket reaches the other participant in real time, and is persisted', async () => {
    const aliceSocket = await connectSocket(alice.token);
    const bobSocket = await connectSocket(bob.token);
    try {
      await Promise.all([emitAsync(aliceSocket, 'request:join', requestId), emitAsync(bobSocket, 'request:join', requestId)]);

      const received = new Promise((resolve) => bobSocket.once('message:new', resolve));
      const sendAck = await emitAsync(aliceSocket, 'message:send', { requestId, text: '  Hi Bob, when can you teach me guitar?  ' });
      assert.equal(sendAck.ok, true);
      assert.equal(sendAck.message.text, 'Hi Bob, when can you teach me guitar?', 'trimmed');
      assert.equal(sendAck.message.senderId, alice.user.id);

      const pushed = await received;
      assert.equal(pushed.text, 'Hi Bob, when can you teach me guitar?');
      assert.equal(pushed.senderName, 'Alice');

      const stored = await Message.findOne({ request: requestId });
      assert.equal(stored.text, 'Hi Bob, when can you teach me guitar?');

      const history = await api('GET', `/requests/${requestId}/messages`, { token: bob.token });
      assert.equal(history.body.messages.length, 1);
      assert.equal(history.body.messages[0].senderName, 'Alice');
      assert.equal(history.body.messages[0].requestId, requestId);
    } finally {
      aliceSocket.close();
      bobSocket.close();
    }
  });

  it('rejects an empty message, a too-long one, and sending into a conversation you are not part of', async () => {
    const carolSocket = await connectSocket(carol.token);
    const aliceSocket = await connectSocket(alice.token);
    try {
      const empty = await emitAsync(aliceSocket, 'message:send', { requestId, text: '   ' });
      assert.equal(empty.ok, false);
      const tooLong = await emitAsync(aliceSocket, 'message:send', { requestId, text: 'x'.repeat(2001) });
      assert.equal(tooLong.ok, false);
      const outsider = await emitAsync(carolSocket, 'message:send', { requestId, text: 'sneaky' });
      assert.equal(outsider.ok, false);
      assert.equal(await Message.countDocuments({ text: 'sneaky' }), 0);
    } finally {
      carolSocket.close();
      aliceSocket.close();
    }
  });

  it('messages are not visible to or sendable in a different accepted conversation', async () => {
    const dan = await registerUser({ name: 'Dan' });
    await setSkills(dan.token, [skill('Chess')], []);
    const sent = await api('POST', '/requests', { token: alice.token, body: { recipientId: dan.user.id, skillWanted: 'Chess' } });
    const otherRequestId = sent.body.request.id;
    await api('PATCH', `/requests/${otherRequestId}`, { token: dan.token, body: { status: 'accepted' } });

    const carolSocket = await connectSocket(carol.token);
    try {
      const join = await emitAsync(carolSocket, 'request:join', otherRequestId);
      assert.equal(join.ok, false, 'Carol is not part of this conversation either');
    } finally {
      carolSocket.close();
    }

    const bobHistory = await api('GET', `/requests/${otherRequestId}/messages`, { token: bob.token });
    assert.equal(bobHistory.status, 404, "Bob cannot see Alice and Dan's conversation");
  });

  it('serves an on-demand video room with both participants as moderators in the same room', async () => {
    const aliceRoom = await api('GET', `/requests/${requestId}/room`, { token: alice.token });
    const bobRoom = await api('GET', `/requests/${requestId}/room`, { token: bob.token });
    assert.equal(aliceRoom.status, 200);
    assert.equal(bobRoom.status, 200);
    assert.equal(aliceRoom.body.room.roomName, bobRoom.body.room.roomName);
    assert.ok(aliceRoom.body.room.roomName.startsWith(`${JAAS.appId}/request-`));
    assert.notEqual(aliceRoom.body.room.jwt, bobRoom.body.room.jwt);

    for (const room of [aliceRoom.body.room, bobRoom.body.room]) {
      assert.equal(room.moderator, true, 'neither side is a "host": both are equal moderators');
      const payload = jwt.verify(room.jwt, JAAS.publicKey);
      assert.equal(payload.context.user.moderator, 'true');
      assert.equal(payload.room, room.roomName.split('/')[1]);
    }

    assert.equal((await api('GET', `/requests/${requestId}/room`, { token: carol.token })).status, 404);
  });

  it('a rejected request never gets a chat or a room', async () => {
    const eve = await registerUser({ name: 'Eve' });
    await setSkills(eve.token, [skill('Cooking')], []);
    const sent = await api('POST', '/requests', { token: alice.token, body: { recipientId: eve.user.id, skillWanted: 'Cooking' } });
    await api('PATCH', `/requests/${sent.body.request.id}`, { token: eve.token, body: { status: 'rejected' } });

    assert.equal((await api('GET', `/requests/${sent.body.request.id}/messages`, { token: alice.token })).status, 404);
    assert.equal((await api('GET', `/requests/${sent.body.request.id}/room`, { token: alice.token })).status, 404);
  });
});
