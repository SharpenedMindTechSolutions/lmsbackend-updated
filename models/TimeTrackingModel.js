import mongoose from 'mongoose';

const activityTimeSchema = new mongoose.Schema(
  {
    activityType: {
      type: String,
      enum: ['video', 'game', 'quiz', 'assignment', 'browse'],
      default: 'browse'
    },
    seconds: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

const timeTrackingSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    secondsSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    activities: {
      type: [activityTimeSchema],
      default: []
    }
  },
  { timestamps: true }
);

// Compound index for fast upserts per student, date, and course
timeTrackingSchema.index({ studentId: 1, date: 1, courseId: 1 }, { unique: true });

export default mongoose.models.TimeTracking || mongoose.model('TimeTracking', timeTrackingSchema);
