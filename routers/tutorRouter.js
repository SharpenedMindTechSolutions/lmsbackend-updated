import { Router } from 'express';
import Enum from '../utils/enum.js';
import Tutor from "../controllers/tutorController.js";
import authMiddleware from '../middlewares/authMiddlewares.js';

const router = Router();
const { TUTOR, STUDENT } = Enum.ROLES;
const { authorize, authenticateRole } = authMiddleware;

// public routes
router.post('/create/tutor', Tutor.createTutor);
router.post('/login/tutor', Tutor.loginTutor);
router.get('/getAll/tutor', Tutor.getAllTutors);
router.post('/forgot-password/tutor', Tutor.forgotPassword);
router.post('/reset-password/tutor', Tutor.resetPassword);

// protected routes
router.get("/gettutorById/:id", authorize, authenticateRole([TUTOR]), Tutor.getTutorById);
router.put("/update/:id", authorize, authenticateRole([TUTOR]), Tutor.updateTutor);
router.delete("/delete/:id", authorize, authenticateRole([TUTOR]), Tutor.deleteTutor);

export default router;
