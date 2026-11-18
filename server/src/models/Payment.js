import mongoose from 'mongoose';

/**
 * A receipt for one student's payment for one paid class.
 *
 * This is a MOCK payment: `provider: 'mock'` means "paid" was recorded by our own server with no
 * real money moving, no card details collected, and no outside gateway involved. It exists so the
 * paid-class flow (and the diagrams/documents describing one) has something real to point at.
 * Swapping in a real gateway (e.g. Razorpay, in test or live mode) means adding its keys and a
 * second branch alongside `payForSession` in sessions.controller.js — the rest of the app (the
 * Session.price field, the join gate, the receipt record) stays the same.
 */
const paymentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    provider: { type: String, enum: ['mock'], default: 'mock' },
  },
  { timestamps: true },
);

// One receipt per student per class — paying twice for the same class just returns the first one.
paymentSchema.index({ student: 1, session: 1 }, { unique: true });

export const Payment = mongoose.model('Payment', paymentSchema);
