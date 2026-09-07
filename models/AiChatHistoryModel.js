import mongoose from 'mongoose';

const aiChatHistorySchema = new mongoose.Schema({
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
    messages: [
        {
            role: {
                type: String,
                enum: ['user', 'model'],
                required: true
            },
            content: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }
    ]
}, { timestamps: true });

// Ensure a unique chat history per student per session
aiChatHistorySchema.index({ studentId: 1, sessionId: 1 }, { unique: true });

export default mongoose.model('AiChatHistory', aiChatHistorySchema);
