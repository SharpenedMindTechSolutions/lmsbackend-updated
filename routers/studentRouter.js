import { Router } from 'express';
import Enum from '../utils/enum.js';
import Student from '../controllers/studentController.js';
import authMiddleware from '../middlewares/authMiddlewares.js';

const router = Router();
const { TUTOR, STUDENT } = Enum.ROLES;
const { authorize, authenticateRole } = authMiddleware;

// public routes
router.post('/create/student', Student.createStudent);
router.post('/login/student', Student.loginStudent);
router.post('/logout/student', Student.logoutStudent);
router.post('/forgot-password/student', Student.forgotPassword);
router.post('/reset-password/student', Student.resetPassword);

// protected routes (student must be authenticated)
router.get('/getAll/student', authorize, authenticateRole([TUTOR]), Student.getAllStudents);
router.get('/getStudentById/:id', authorize, Student.getStudentById);
router.put('/updateStudent/:id', authorize, authenticateRole([STUDENT, TUTOR]), Student.updateStudent);
router.delete('/deleteStudent/:id', authorize, authenticateRole([STUDENT, TUTOR]), Student.deleteStudent);

export default router;
