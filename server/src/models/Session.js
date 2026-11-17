import mongoose from 'mongoose';

export const SESSION_STATUSES = ['scheduled', 'cancelled'];

// A class (live video session) hosted by a verified instructor.
const sessionSchema = new mongoose.Schema(
  {
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    skill: { type: String, required: true, trim: true, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    startsAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, required: true, min: 15, max: 240 },
    // Stored (not derived) so "is it over yet?" is a simple indexed query.
    endsAt: { type: Date, required: true, index: true },
    capacity: { type: Number, required: true, min: 1, max: 100 },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: SESSION_STATUSES, default: 'scheduled' },
    // Unguessable room name. Only revealed, with a signed token, to the host and joined students.
    roomId: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

sessionSchema.index({ attendees: 1, startsAt: 1 });

export const Session = mongoose.model('Session', sessionSchema);
