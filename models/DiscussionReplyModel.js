import mongoose from 'mongoose';

const discussionReplySchema = new mongoose.Schema({
  discussionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discussion',
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
  content: {
    type: String,
    required: true
  },
  isTutorAnswer: {
    type: Boolean,
    default: false
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId
  }]
}, { timestamps: true });

const DiscussionReply = mongoose.models.DiscussionReply || mongoose.model('DiscussionReply', discussionReplySchema);
export default DiscussionReply;
