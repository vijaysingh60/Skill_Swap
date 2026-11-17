import mongoose from 'mongoose';

export const REQUEST_STATUSES = ['pending', 'accepted', 'rejected'];

const exchangeRequestSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // The skill the requester wants to learn (taught by the recipient).
    skillWanted: { type: String, required: true, trim: true, maxlength: 40 },
    // The skill the requester offers to teach in return.
    skillOffered: { type: String, required: true, trim: true, maxlength: 40 },
    message: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: REQUEST_STATUSES, default: 'pending' },
  },
  { timestamps: true },
);

// At most one pending request per (requester, recipient, skill pair).
exchangeRequestSchema.index(
  { requester: 1, recipient: 1, skillWanted: 1, skillOffered: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);

export const ExchangeRequest = mongoose.model('ExchangeRequest', exchangeRequestSchema);
