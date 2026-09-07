import mongoose from 'mongoose';

const discussionSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  authorRole: {
    type: String,
    enum: ['student', 'tutor'],
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Unanswered', 'Answered', 'Tutor Answered'],
    default: 'Unanswered',
    index: true
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId // Array of user IDs to prevent duplicate upvotes
  }],
  replyCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Add text index for searching
discussionSchema.index({ title: 'text', content: 'text' });

const Discussion = mongoose.models.Discussion || mongoose.model('Discussion', discussionSchema);
export default Discussion;
