import mongoose from 'mongoose';

/* ── Counter collection for sequential certificate IDs ──── */
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

const certificateSchema = new mongoose.Schema(
    {
        certificateId: {
            type: String,
            unique: true,
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
        studentName: {
            type: String,
            required: true
        },
        courseName: {
            type: String,
            required: true
        },
        issuedAt: {
            type: Date,
            default: Date.now
        },
        verificationStatus: {
            type: String,
            enum: ['valid', 'revoked'],
            default: 'valid'
        }
    },
    { timestamps: true }
);

// Prevent duplicate certificates for the same student and course
certificateSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

// Note: no need to add a separate index on certificateId here —
// `unique: true` on the field above already creates that index.
// Adding certificateSchema.index({ certificateId: 1 }) again caused
// the "Duplicate schema index" warning, so it has been removed.

/**
 * Generate the next sequential certificate ID: SMD-LMS-001, SMD-LMS-002, ...
 */
export const getNextCertificateId = async () => {
    const counter = await Counter.findByIdAndUpdate(
        'certificateId',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return `SMD-LMS-${String(counter.seq).padStart(3, '0')}`;
};

export default mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);