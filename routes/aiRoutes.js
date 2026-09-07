import express from 'express';
import { askCopilot, generateQuiz, getCopilotHistory, clearCopilotHistory } from '../controllers/aiController.js';
import auth from '../middlewares/authMiddlewares.js';

const router = express.Router();

const isStudent = [auth.authorize, auth.authenticateRole(['student'])];
const isTutor = [auth.authorize, auth.authenticateRole(['tutor'])];

// Student AI Copilot Routes
router.post('/copilot', isStudent, askCopilot);
router.get('/copilot/history/:sessionId', isStudent, getCopilotHistory);
router.delete('/copilot/history/:sessionId', isStudent, clearCopilotHistory);

// Tutor AI Quiz Generator Routes
router.post('/quiz/generate', isTutor, generateQuiz);

export default router;
