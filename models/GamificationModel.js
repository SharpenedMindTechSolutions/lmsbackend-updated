import mongoose from 'mongoose';

const activityItemSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    activityType: {
      type: String,
      enum: ['game', 'video', 'test', 'assignment'],
      required: true
    },
    referenceId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      default: ''
    },
    xpEarned: {
      type: Number,
      required: true,
      min: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const gamificationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true,
      index: true
    },
    totalXP: {
      type: Number,
      default: 0,
      min: 0
    },
    level: {
      type: Number,
      default: 1,
      min: 1
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    lastActivityDate: {
      type: String, // YYYY-MM-DD
      default: null
    },
    activityHistory: {
      type: [activityItemSchema],
      default: []
    }
  },
  { timestamps: true }
);

// Helper method to compute level from XP (100 XP per level)
gamificationSchema.methods.calculateLevel = function () {
  this.level = Math.floor(this.totalXP / 100) + 1;
  return this.level;
};

export default mongoose.models.Gamification || mongoose.model('Gamification', gamificationSchema);
