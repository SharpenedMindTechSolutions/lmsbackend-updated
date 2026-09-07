import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Course title is required'],
            trim: true,
            minlength: [3, 'Title must be at least 3 characters'],
            maxlength: [100, 'Title cannot exceed 100 characters']
        },
        description: {
            type: String,
            required: [true, 'Course description is required'],
            trim: true,
            minlength: [10, 'Description must be at least 10 characters']
        },
        tutorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tutor',
            required: true
        },
        // Tutor creates this code once and shares it with students
        enrollmentCode: {
            type: String,
            default: null
        },
        price: {
            type: Number,
            default: 0
        },
        isPaid: {
            type: Boolean,
            default: false
        },
        isComboOffer: {
            type: Boolean,
            default: false
        },
        bundledCourses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        }]
    },
    { timestamps: true }
);

export default mongoose.models.Course || mongoose.model('Course', courseSchema);
