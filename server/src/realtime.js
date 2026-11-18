import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { ExchangeRequest } from './models/ExchangeRequest.js';
import { Message } from './models/Message.js';
import { User } from './models/User.js';

const MAX_MESSAGE_LENGTH = 2000;
const roomName = (requestId) => `request:${requestId}`;

/**
 * Real-time chat for accepted exchange requests. Deliberately small: one event in
 * ("message:send"), one event out ("message:new"), scoped to a Socket.IO room per request so a
 * message only reaches the two people it's between. History (what was said before this connection
 * opened) is loaded separately over REST — GET /api/requests/:id/messages.
 */
export function attachRealtime(httpServer) {
  const io = new Server(httpServer, { cors: { origin: config.clientUrl } });

  // Same bearer token the REST API uses, just read from the handshake instead of a header.
  io.use(async (socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth?.token ?? '', config.jwtSecret);
      const user = await User.findById(payload.sub);
      if (!user) throw new Error('user not found');
      socket.user = user;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    // Joining is itself access-controlled: only an actual participant in an accepted request
    // is let into that request's room, so a message can never reach anyone else.
    socket.on('request:join', async (requestId, ack) => {
      try {
        const request = await ExchangeRequest.findOne({
          _id: requestId,
          status: 'accepted',
          $or: [{ requester: socket.user._id }, { recipient: socket.user._id }],
        });
        if (!request) return ack?.({ ok: false, error: 'This conversation is not available.' });
        socket.join(roomName(requestId));
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false, error: 'Could not open that conversation.' });
      }
    });

    socket.on('message:send', async ({ requestId, text } = {}, ack) => {
      try {
        const trimmed = typeof text === 'string' ? text.trim() : '';
        if (!trimmed) return ack?.({ ok: false, error: 'Message is empty.' });
        if (trimmed.length > MAX_MESSAGE_LENGTH) return ack?.({ ok: false, error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters.` });

        // Re-check membership on every send, not just at join time — a request could in principle
        // change state while the socket stays connected, and this is the only real gate that matters.
        const request = await ExchangeRequest.findOne({
          _id: requestId,
          status: 'accepted',
          $or: [{ requester: socket.user._id }, { recipient: socket.user._id }],
        });
        if (!request) return ack?.({ ok: false, error: 'This conversation is not available.' });

        const saved = await Message.create({ request: request._id, sender: socket.user._id, text: trimmed });
        const payload = { id: String(saved._id), requestId: String(request._id), senderId: String(socket.user._id), senderName: socket.user.name, text: saved.text, createdAt: saved.createdAt };

        io.to(roomName(requestId)).emit('message:new', payload);
        ack?.({ ok: true, message: payload });
      } catch {
        ack?.({ ok: false, error: 'Could not send that message. Please try again.' });
      }
    });
  });

  return io;
}
