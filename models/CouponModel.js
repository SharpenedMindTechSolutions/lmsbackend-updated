import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true
        },
        discountPercentage: {
            type: Number,
            min: 1,
            max: 100,
            required: true
        },
        maxDiscount: {
            type: Number,
            default: null // Null means no max discount
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        expiryDate: {
            type: Date,
            default: null // Null means never expires
        },
        usageLimit: {
            type: Number,
            default: null // Null means unlimited
        },
        usedCount: {
            type: Number,
            default: 0
        },
        isActive: {
            type: Boolean,
            default: true
        },
        // Optional: array of course IDs this coupon applies to. Empty array means all courses.
        applicableCourses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        }]
    },
    { timestamps: true }
);

export default mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
