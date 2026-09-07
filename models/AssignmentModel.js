import mongoose from 'mongoose';

// ── Assignment (one per course, created by tutor) ──────────────────────────────
const assignmentSchema = new mongoose.Schema(
    {
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
            unique: true          // one assignment per course
        },
        tutorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tutor',
            required: true
        },
        title: {
            type: String,
            required: [true, 'Assignment title is required'],
            trim: true,
            minlength: [3, 'Title must be at least 3 characters'],
            maxlength: [150, 'Title cannot exceed 150 characters']
        },
        description: {
            type: String,
            required: [true, 'Assignment description is required'],
            trim: true,
            minlength: [10, 'Description must be at least 10 characters']
        },
        dueDate: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

export default mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);
