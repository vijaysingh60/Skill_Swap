import mongoose from 'mongoose';

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'];
export const ROLES = ['user', 'admin'];
export const MODES = ['student', 'instructor'];
export const INSTRUCTOR_STATUSES = ['none', 'pending', 'verified', 'rejected'];

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    level: { type: String, enum: SKILL_LEVELS, default: 'beginner' },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    university: { type: String, required: true, trim: true, maxlength: 120 },
    department: { type: String, required: true, trim: true, maxlength: 120 },
    bio: { type: String, trim: true, maxlength: 300, default: '' },
    // Skills this student can teach, and skills they want to learn.
    skillsOffered: { type: [skillSchema], default: [] },
    skillsWanted: { type: [skillSchema], default: [] },

    // Only an admin can change `role` or approve an instructor; no public endpoint writes these.
    role: { type: String, enum: ROLES, default: 'user' },
    // Which hat the user is wearing in the UI. Only meaningful while instructor.status is "verified".
    mode: { type: String, enum: MODES, default: 'student' },
    instructor: {
      status: { type: String, enum: INSTRUCTOR_STATUSES, default: 'none' },
      headline: { type: String, trim: true, maxlength: 80, default: '' },
      experience: { type: String, trim: true, maxlength: 800, default: '' },
      appliedAt: Date,
      reviewedAt: Date,
      reviewNote: { type: String, trim: true, maxlength: 300, default: '' },
    },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
