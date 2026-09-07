import mongoose from 'mongoose';

const videoNoteSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true
        },
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Session',
            required: true
        },
        timestamp: {
            type: Number,
            default: null // Null if the video source doesn't support timestamps (like Drive iframe)
        },
        noteText: {
            type: String,
            required: true,
            trim: true
        }
    },
    { timestamps: true }
);

// Indexes for fast querying per student/session
videoNoteSchema.index({ studentId: 1, sessionId: 1 });
videoNoteSchema.index({ studentId: 1, courseId: 1 });

export default mongoose.models.VideoNote || mongoose.model('VideoNote', videoNoteSchema);
