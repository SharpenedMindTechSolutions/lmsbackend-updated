import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
    {
        questionText: {
            type: String,
            required: [true, 'Question text is required'],
            trim: true
        },
        options: {
            type: [String],
            validate: {
                validator: (arr) => arr.length >= 2,
                message: 'Each question must have at least 2 options'
            },
            required: true
        },
        correctAnswer: {
            type: String,
            required: [true, 'Correct answer is required'],
            trim: true
        }
    },
    { _id: true }
);

const testSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Session',
            required: true,
            unique: true  // one test per session
        },
        questions: {
            type: [questionSchema],
            validate: {
                validator: (arr) => arr.length >= 1,
                message: 'Test must have at least 1 question'
            }
        }
    },
    { timestamps: true }
);

export default mongoose.model('Test', testSchema);
