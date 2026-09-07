import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
    {
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true
        },
        sessionTitle: {
            type: String,
            required: [true, 'Session title is required'],
            trim: true,
            minlength: [3, 'Session title must be at least 3 characters']
        },
        videoTitle: {
            type: String,
            required: [true, 'Video title is required'],
            trim: true
        },
        videoDriveLink: {
            type: String,
            required: [true, 'Video drive link is required'],
            trim: true,
            validate: {
                validator: (v) => /^https?:\/\/.+/.test(v),
                message: 'Video drive link must be a valid URL'
            }
        },
        order: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

export default mongoose.model('Session', sessionSchema);
