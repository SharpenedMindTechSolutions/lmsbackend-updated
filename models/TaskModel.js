import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
    {
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
        title: {
            type: String,
            required: [true, 'Task title is required'],
            trim: true,
            minlength: [3, 'Task title must be at least 3 characters']
        },
        description: {
            type: String,
            required: [true, 'Task description is required'],
            trim: true
        },
        instructions: {
            type: String,
            default: ''
        },
        taskType: {
            type: String,
            enum: ['code'],
            default: 'code'
        }
    },
    { timestamps: true }
);

taskSchema.index({ courseId: 1, sessionId: 1 });

export default mongoose.model('Task', taskSchema);
