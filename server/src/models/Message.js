import mongoose from 'mongoose';

// A chat message between the two participants of one accepted exchange request. Sent over the
// Socket.IO connection (see realtime.js) and persisted here so the history survives a reload.
const messageSchema = new mongoose.Schema(
  {
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'ExchangeRequest', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

messageSchema.index({ request: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);
