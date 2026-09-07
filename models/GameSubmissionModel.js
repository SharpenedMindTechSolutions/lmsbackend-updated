import mongoose from 'mongoose';

const gameSubmissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CodingGame',
      required: true,
      index: true
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    isDaily: {
      type: Boolean,
      default: false
    },
    isCorrect: {
      type: Boolean,
      required: true
    },
    submittedAnswer: {
      type: mongoose.Schema.Types.Mixed
    },
    xpEarned: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Compound index to prevent duplicate submissions on the same challenge/date
gameSubmissionSchema.index({ studentId: 1, gameId: 1, date: 1 }, { unique: true });

export default mongoose.models.GameSubmission || mongoose.model('GameSubmission', gameSubmissionSchema);
