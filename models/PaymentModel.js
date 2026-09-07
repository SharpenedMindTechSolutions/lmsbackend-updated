import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: [true, 'Student ID is required']
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: [true, 'Course ID is required']
        },
        amount: {
            type: Number,
            required: [true, 'Payment amount is required']
        },
        currency: {
            type: String,
            default: 'INR'
        },
        utr: {
            type: String,
            required: [true, 'UTR / Transaction Reference Number is required'],
            trim: true,
            uppercase: true
        },
        paymentMethod: {
            type: String,
            default: 'UPI'
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'refunded', 'paid', 'created', 'failed'],
            default: 'pending'
        },
        submittedAt: {
            type: Date,
            default: Date.now
        },
        verifiedAt: {
            type: Date,
            default: null
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            default: null
        },
        rejectionReason: {
            type: String,
            default: null
        },
        orderId: {
            type: String,
            default: () => `order_upi_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        },
        paymentId: {
            type: String,
            default: null
        },
        metadata: {
            originalPrice: { type: Number },
            couponCode: { type: String, default: null },
            discountAmount: { type: Number, default: 0 }
        }
    },
    { timestamps: true }
);

// Prevent duplicate UTR submissions across active/pending/approved payments
paymentSchema.index({ utr: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['pending', 'approved', 'paid'] } } });

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
