import mongoose from 'mongoose';

const taskSubmissionSchema = new mongoose.Schema(
    {
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
            required: true
        },
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
        submittedCode: {
            type: String,
            required: [true, 'Submitted code is required']
        },
        status: {
            type: String,
            enum: ['submitted', 'reviewed'],
            default: 'submitted'
        },
        feedback: {
            type: String,
            default: ''
        },
        submittedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

// One submission per student per task
taskSubmissionSchema.index({ taskId: 1, studentId: 1 }, { unique: true });

export default mongoose.model('TaskSubmission', taskSubmissionSchema);
