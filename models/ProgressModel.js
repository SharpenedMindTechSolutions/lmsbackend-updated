import mongoose from 'mongoose';

const testScoreSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Session',
            required: true
        },
        score: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        }
    },
    { _id: false }
);

const progressSchema = new mongoose.Schema(
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
        completedSessions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Session'
            }
        ],
        completedTasks: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Task'
            }
        ],
        testScores: {
            type: [testScoreSchema],
            default: []
        },
        overallScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        completionStatus: {
            type: String,
            enum: ['in-progress', 'completed'],
            default: 'in-progress'
        }
    },
    { timestamps: true }
);

// One progress doc per student per course
progressSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

export default mongoose.model('Progress', progressSchema);
