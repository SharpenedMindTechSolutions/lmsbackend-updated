import mongoose from 'mongoose';

/**
 * VideoProgress — tracks per-student, per-session video watch progress.
 * `watchedPercent` is updated as the student watches; once >= 90 it's marked completed.
 */
const videoProgressSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true
        },
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Session',
            required: true
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true
        },
        watchedPercent: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        isCompleted: {
            type: Boolean,
            default: false
        },
        completedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// One video-progress record per student per session
videoProgressSchema.index({ studentId: 1, sessionId: 1 }, { unique: true });

export default mongoose.models.VideoProgress || mongoose.model('VideoProgress', videoProgressSchema);
