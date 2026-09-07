import express from 'express';
import {
  createDiscussion,
  getSessionDiscussions,
  getDiscussionById,
  updateDiscussion,
  deleteDiscussion,
  upvoteDiscussion,
  addReply,
  updateReply,
  deleteReply,
  upvoteReply,
  markTutorAnswer
} from '../controllers/discussionController.js';
import authMiddleware from '../middlewares/authMiddlewares.js';

const router = express.Router();
const { authorize, authenticateRole } = authMiddleware;

// Discussion routes
router.post('/', authorize, createDiscussion);
router.get('/session/:sessionId', authorize, getSessionDiscussions);
router.get('/:id', authorize, getDiscussionById);
router.put('/:id', authorize, updateDiscussion);
router.delete('/:id', authorize, deleteDiscussion);
router.post('/:id/upvote', authorize, upvoteDiscussion);

// Reply routes
router.post('/:id/replies', authorize, addReply);
router.put('/replies/:id', authorize, updateReply);
router.delete('/replies/:id', authorize, deleteReply);
router.post('/replies/:id/upvote', authorize, upvoteReply);

// Tutor specific route
router.put('/replies/:id/tutor-answer', authorize, authenticateRole(['tutor']), markTutorAnswer);

export default router;
