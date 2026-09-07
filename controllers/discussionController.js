import Discussion from '../models/DiscussionModel.js';
import DiscussionReply from '../models/DiscussionReplyModel.js';
import Enrollment from '../models/EnrollmentModel.js';
import Course from '../models/CourseModel.js';
import mongoose from 'mongoose';

// Utility to verify course access
const verifyAccess = async (courseId, user, role) => {
  if (role === 'tutor') {
    const course = await Course.findById(courseId);
    if (!course || course.tutorId.toString() !== (user.id || user._id).toString()) {
      throw new Error('Unauthorized tutor');
    }
  } else if (role === 'student') {
    const enrollment = await Enrollment.findOne({ studentId: user.id || user._id, courseId });
    if (!enrollment) {
      throw new Error('Student not enrolled');
    }
  }
};

// Create a new discussion question
export const createDiscussion = async (req, res) => {
  try {
    const { courseId, sessionId, title, content } = req.body;
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    
    // In our JWT, role is usually 'student' or 'tutor'
    const authorRole = user.role?.toLowerCase() === 'student' ? 'student' : 'tutor';

    if (!title || !content || !courseId || !sessionId) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      await verifyAccess(courseId, user, authorRole);
    } catch (err) {
      return res.status(403).json({ message: err.message });
    }

    const discussion = new Discussion({
      courseId,
      sessionId,
      authorId: user.id || user._id,
      authorRole,
      authorName: user.name || user.firstName + ' ' + user.lastName,
      title,
      content,
    });

    await discussion.save();
    
    // Broadcast via socket could be handled in a separate module or passed directly
    if (req.app.get('io')) {
      req.app.get('io').to(sessionId).emit('new_discussion', discussion);
    }

    res.status(201).json(discussion);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Get discussions for a specific session
export const getSessionDiscussions = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { sort = 'latest', status, search } = req.query;

    let query = { sessionId };
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'upvotes') {
      sortOption = { upvoteCount: -1, createdAt: -1 };
    }

    // We can use aggregation to easily sort by upvote count if needed, but a simple lean() with map works too for basic arrays
    const discussions = await Discussion.find(query)
      .sort(sortOption)
      .lean();

    // Attach upvote count dynamically
    const userId = req.user?.id || req.user?._id;
    const formatted = discussions.map(d => ({
      ...d,
      upvoteCount: d.upvotes ? d.upvotes.length : 0,
      hasUpvoted: d.upvotes ? d.upvotes.map(id => id.toString()).includes(userId) : false
    }));

    if (sort === 'upvotes') {
      formatted.sort((a, b) => b.upvoteCount - a.upvoteCount);
    }

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Get single discussion with its replies
export const getDiscussionById = async (req, res) => {
  try {
    const { id } = req.params;
    const discussion = await Discussion.findById(id).lean();
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    const replies = await DiscussionReply.find({ discussionId: id }).sort({ createdAt: 1 }).lean();
    
    const userId = req.user?.id || req.user?._id;

    res.json({
      ...discussion,
      upvoteCount: discussion.upvotes ? discussion.upvotes.length : 0,
      hasUpvoted: discussion.upvotes ? discussion.upvotes.map(i => i.toString()).includes(userId) : false,
      replies: replies.map(r => ({
        ...r,
        upvoteCount: r.upvotes ? r.upvotes.length : 0,
        hasUpvoted: r.upvotes ? r.upvotes.map(i => i.toString()).includes(userId) : false
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Update discussion
export const updateDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user?.id || req.user?._id;

    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({ message: 'Not found' });
    }

    if (discussion.authorId.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to edit this discussion' });
    }

    discussion.title = title || discussion.title;
    discussion.content = content || discussion.content;
    await discussion.save();

    res.json(discussion);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Delete discussion
export const deleteDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const userId = user?.id || user?._id;

    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({ message: 'Not found' });
    }

    if (discussion.authorId.toString() !== userId && user.role?.toLowerCase() !== 'tutor') {
      // Tutor can technically delete any discussion in their course if we want, but let's stick to author-only for now unless it's a strict requirement.
      // We will strictly enforce author-only here.
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Optional: Allow tutor to delete if it's their course
    if (user.role?.toLowerCase() === 'tutor' && discussion.authorId.toString() !== userId) {
      await verifyAccess(discussion.courseId, user, 'tutor');
    } else if (discussion.authorId.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Discussion.findByIdAndDelete(id);
    await DiscussionReply.deleteMany({ discussionId: id }); // Cascade delete replies

    if (req.app.get('io')) {
      req.app.get('io').to(discussion.sessionId.toString()).emit('delete_discussion', id);
    }

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Upvote discussion
export const upvoteDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    const discussion = await Discussion.findById(id);
    if (!discussion) return res.status(404).json({ message: 'Not found' });

    const upvoteIndex = discussion.upvotes.findIndex(u => u.toString() === userId);
    
    let hasUpvoted = false;
    if (upvoteIndex === -1) {
      discussion.upvotes.push(userId);
      hasUpvoted = true;
    } else {
      discussion.upvotes.splice(upvoteIndex, 1);
    }
    
    await discussion.save();

    res.json({ 
      upvotes: discussion.upvotes.length, 
      hasUpvoted 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ==============================
// REPLIES
// ==============================

export const addReply = async (req, res) => {
  try {
    const { id } = req.params; // discussionId
    const { content } = req.body;
    
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const authorRole = user.role?.toLowerCase() === 'student' ? 'student' : 'tutor';

    const discussion = await Discussion.findById(id);
    if (!discussion) return res.status(404).json({ message: 'Discussion not found' });

    try {
      await verifyAccess(discussion.courseId, user, authorRole);
    } catch (err) {
      return res.status(403).json({ message: err.message });
    }

    const reply = new DiscussionReply({
      discussionId: id,
      authorId: user.id || user._id,
      authorRole,
      authorName: user.name || user.firstName + ' ' + user.lastName,
      content
    });

    await reply.save();

    // Update discussion status & reply count
    discussion.replyCount += 1;
    if (authorRole === 'tutor') {
      discussion.status = 'Tutor Answered';
    } else if (discussion.status === 'Unanswered') {
      discussion.status = 'Answered';
    }
    await discussion.save();

    if (req.app.get('io')) {
      req.app.get('io').to(discussion.sessionId.toString()).emit('new_reply', reply);
    }

    res.status(201).json(reply);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export const updateReply = async (req, res) => {
  try {
    const { id } = req.params; // replyId
    const { content } = req.body;
    const userId = req.user?.id || req.user?._id;

    const reply = await DiscussionReply.findById(id);
    if (!reply) return res.status(404).json({ message: 'Not found' });

    if (reply.authorId.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    reply.content = content || reply.content;
    await reply.save();

    res.json(reply);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export const deleteReply = async (req, res) => {
  try {
    const { id } = req.params; // replyId
    const userId = req.user?.id || req.user?._id;

    const reply = await DiscussionReply.findById(id);
    if (!reply) return res.status(404).json({ message: 'Not found' });

    if (reply.authorId.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const discussion = await Discussion.findById(reply.discussionId);
    
    await DiscussionReply.findByIdAndDelete(id);

    if (discussion) {
      discussion.replyCount = Math.max(0, discussion.replyCount - 1);
      // recalculate status
      if (discussion.replyCount === 0) {
        discussion.status = 'Unanswered';
      }
      await discussion.save();
    }

    if (req.app.get('io') && discussion) {
      req.app.get('io').to(discussion.sessionId.toString()).emit('delete_reply', id);
    }

    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export const upvoteReply = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.student?.id || req.tutor?.id;

    const reply = await DiscussionReply.findById(id);
    if (!reply) return res.status(404).json({ message: 'Not found' });

    const upvoteIndex = reply.upvotes.findIndex(u => u.toString() === userId);
    
    let hasUpvoted = false;
    if (upvoteIndex === -1) {
      reply.upvotes.push(userId);
      hasUpvoted = true;
    } else {
      reply.upvotes.splice(upvoteIndex, 1);
    }
    
    await reply.save();

    res.json({ 
      upvotes: reply.upvotes.length, 
      hasUpvoted 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export const markTutorAnswer = async (req, res) => {
  try {
    const { id } = req.params; // replyId
    const user = req.user;
    
    if (user.role?.toLowerCase() !== 'tutor') {
      return res.status(403).json({ message: 'Only tutors can mark answers' });
    }

    const reply = await DiscussionReply.findById(id);
    if (!reply) return res.status(404).json({ message: 'Not found' });

    const discussion = await Discussion.findById(reply.discussionId);
    if (!discussion) return res.status(404).json({ message: 'Discussion not found' });

    // Verify tutor owns the course
    await verifyAccess(discussion.courseId, user, 'tutor');

    reply.isTutorAnswer = !reply.isTutorAnswer; // toggle
    await reply.save();

    if (reply.isTutorAnswer) {
      discussion.status = 'Tutor Answered';
    } else {
      // Re-evaluate status if there are other tutor answers
      const otherTutorAnswers = await DiscussionReply.countDocuments({ discussionId: discussion._id, isTutorAnswer: true });
      if (otherTutorAnswers === 0) {
        const anyReplies = await DiscussionReply.countDocuments({ discussionId: discussion._id });
        discussion.status = anyReplies > 0 ? 'Answered' : 'Unanswered';
      }
    }
    await discussion.save();

    if (req.app.get('io')) {
      req.app.get('io').to(discussion.sessionId.toString()).emit('tutor_answer_marked', reply);
    }

    res.json(reply);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
