import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
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
        studentName: {
            type: String,
            required: true
        },
        enrollmentCode: {
            type: String,
            default: null
        },
        message: {
            type: String,
            default: ''
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        verifiedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// Prevent duplicate enrollments
enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

export default mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema);