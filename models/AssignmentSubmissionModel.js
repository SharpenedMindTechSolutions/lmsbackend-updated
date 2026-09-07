import mongoose from 'mongoose';

// Allowed file types a student can submit
const ALLOWED_FILE_TYPES = ['pdf', 'doc', 'docx', 'zip'];

// ── AssignmentSubmission (one per student per assignment) ──────────────────────
const submissionSchema = new mongoose.Schema(
    {
        assignmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Assignment',
            required: true
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true
        },
        studentName: {
            type: String,
            required: true
        },
        // File details (stored as a Google Drive / cloud link + metadata)
        fileUrl: {
            type: String,
            required: [true, 'File URL is required'],
            trim: true,
            validate: {
                validator: (v) => /^https?:\/\/.+/.test(v),
                message: 'fileUrl must be a valid URL'
            }
        },
        fileName: {
            type: String,
            required: [true, 'File name is required'],
            trim: true
        },
        fileType: {
            type: String,
            required: [true, 'File type is required'],
            enum: {
                values: ALLOWED_FILE_TYPES,
                message: `File type must be one of: ${ALLOWED_FILE_TYPES.join(', ')}`
            },
            lowercase: true
        },
        // Tutor review
        grade: {
            type: String,
            default: null
        },
        feedback: {
            type: String,
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// Prevent duplicate submissions
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

export default mongoose.models.AssignmentSubmission ||
    mongoose.model('AssignmentSubmission', submissionSchema);
