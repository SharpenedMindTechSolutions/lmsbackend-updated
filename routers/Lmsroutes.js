import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddlewares.js';
import courseController from '../controllers/courseController.js';
import sessionController from '../controllers/sessionController.js';
import testController from '../controllers/testController.js';
import enrollmentController from '../controllers/enrollmentController.js';
import progressController from '../controllers/progressController.js';
import assignmentController from '../controllers/assignmentController.js';
import videoProgressController from '../controllers/videoProgressController.js';
import gamificationController from '../controllers/gamificationController.js';
import codingGameController from '../controllers/codingGameController.js';
import timeTrackingController from '../controllers/timeTrackingController.js';
import certificateController from '../controllers/certificateController.js';
import videoNoteController from '../controllers/videoNoteController.js';
import taskController from '../controllers/taskController.js';

const router = Router();

const { authorize, authorizeOptional, authenticateRole, verifyCourseOwnership } = authMiddleware;

import paymentController from '../controllers/paymentController.js';
import adminController from '../controllers/adminController.js';
import comboController from '../controllers/comboController.js';

// ── ADMIN AUTH ROUTES ─────────────────────────────────────────────────────────
router.post('/admin/login', adminController.login);

// ── PAYMENT ROUTES ────────────────────────────────────────────────────────────
router.post('/payments/validate-coupon', authorize, authenticateRole(['student']), paymentController.validateCoupon);
router.post('/payments/submit-upi', authorize, authenticateRole(['student']), paymentController.submitUpiPayment);
router.get('/payments/status/:courseId', authorize, authenticateRole(['student']), paymentController.getPaymentStatus);
router.post('/payments/create-order', authorize, authenticateRole(['student']), paymentController.submitUpiPayment); // Legacy fallback
router.post('/payments/verify', authorize, authenticateRole(['student']), paymentController.submitUpiPayment); // Legacy fallback
router.get('/payments/my-payments', authorize, authenticateRole(['student']), paymentController.getMyPayments);

// ── SUPER ADMIN ROUTES ────────────────────────────────────────────────────────
router.get('/admin/metrics', authorize, authenticateRole(['admin']), adminController.getDashboardMetrics);
router.get('/admin/students', authorize, authenticateRole(['admin']), adminController.getAllStudents);
router.get('/admin/tutors', authorize, authenticateRole(['admin']), adminController.getAllTutors);
router.get('/admin/courses', authorize, authenticateRole(['admin']), adminController.getAllCourses);
router.get('/admin/payments', authorize, authenticateRole(['admin']), adminController.getAllPayments);
router.put('/admin/payments/:id/approve', authorize, authenticateRole(['admin']), adminController.approvePayment);
router.put('/admin/payments/:id/reject', authorize, authenticateRole(['admin']), adminController.rejectPayment);
router.post('/admin/coupons', authorize, authenticateRole(['admin']), adminController.createCoupon);
router.get('/admin/coupons', authorize, authenticateRole(['admin']), adminController.getAllCoupons);
router.put('/admin/coupons/:id/toggle', authorize, authenticateRole(['admin']), adminController.toggleCouponStatus);
router.post('/admin/combo', authorize, authenticateRole(['admin']), comboController.createComboOffer);
router.put('/admin/combo/:id', authorize, authenticateRole(['admin']), comboController.updateComboOffer);
router.delete('/admin/combo/:id', authorize, authenticateRole(['admin']), comboController.deleteComboOffer);

// ── GAMIFICATION (XP & STREAK) ROUTES ─────────────────────────────────────────
router.get('/gamification/my-stats',    authorize, authenticateRole(['student']), gamificationController.getMyGamificationStats);
router.get('/gamification/leaderboard', authorize,                                gamificationController.getLeaderboard);

// ── CODING GAMES (W3SCHOOLS STYLE) ROUTES ─────────────────────────────────────
router.get('/games/daily',   authorize, authenticateRole(['student']), codingGameController.getDailyChallenge);
router.get('/games/all',     authorize, authenticateRole(['student']), codingGameController.getAllChallenges);
router.post('/games/submit', authorize, authenticateRole(['student']), codingGameController.submitGameSolution);

// ── ACTIVE TIME TRACKING ROUTES ───────────────────────────────────────────────
router.post('/analytics/heartbeat',                  authorize, authenticateRole(['student']), timeTrackingController.logHeartbeat);
router.get('/analytics/my-time',                     authorize, authenticateRole(['student']), timeTrackingController.getMyTimeStats);
router.get('/analytics/tutor/course-time/:courseId', authorize, authenticateRole(['tutor']),   timeTrackingController.getTutorCourseStudentTime);

// ── COURSE ROUTES ─────────────────────────────────────────────────────────────
router.post('/courses',       authorize, authenticateRole(['tutor']),                              courseController.createCourse);
router.get('/courses',        authorizeOptional,                                                          courseController.getAllCourses);
router.get('/courses/:id',                                                                         courseController.getCourseById);
router.put('/courses/:id',    authorize, authenticateRole(['tutor']),   verifyCourseOwnership,    courseController.updateCourse);
router.delete('/courses/:id', authorize, authenticateRole(['tutor']),   verifyCourseOwnership,    courseController.deleteCourse);

// ── SESSION ROUTES ────────────────────────────────────────────────────────────
router.post('/courses/:courseId/sessions', authorize, authenticateRole(['tutor']),  verifyCourseOwnership,  sessionController.addSession);
router.get('/courses/:courseId/sessions',  authorize,                                                        sessionController.getSessionsByCourse);
router.get('/sessions/:sessionId',         authorize,                                                        sessionController.getSessionById);
router.put('/sessions/:sessionId',         authorize, authenticateRole(['tutor']),                           sessionController.updateSession);
router.delete('/sessions/:sessionId',      authorize, authenticateRole(['tutor']),                           sessionController.deleteSession);

// ── VIDEO PROGRESS & NOTES ROUTES ─────────────────────────────────────────────────────
// MUST be before generic session routes and BEFORE export
router.post('/sessions/:sessionId/video-progress', authorize, authenticateRole(['student']), videoProgressController.updateVideoProgress);
router.get('/sessions/:sessionId/video-progress',  authorize, authenticateRole(['student']), videoProgressController.getVideoProgress);

router.post('/sessions/:sessionId/notes',          authorize, authenticateRole(['student']), videoNoteController.createNote);
router.get('/sessions/:sessionId/notes',           authorize, authenticateRole(['student']), videoNoteController.getNotesBySession);
router.put('/notes/:noteId',                       authorize, authenticateRole(['student']), videoNoteController.updateNote);
router.delete('/notes/:noteId',                    authorize, authenticateRole(['student']), videoNoteController.deleteNote);

// ── TEST (MCQ) ROUTES ─────────────────────────────────────────────────────────
router.post('/sessions/:sessionId/tests', authorize, authenticateRole(['tutor']),    testController.createTest);
router.get('/sessions/:sessionId/tests',  authorize,                                 testController.getTestBySession);
router.get('/tests/:testId',              authorize,                                 testController.getTestById);
router.put('/tests/:testId',              authorize, authenticateRole(['tutor']),    testController.updateTest);
router.delete('/tests/:testId',           authorize, authenticateRole(['tutor']),    testController.deleteTest);
router.post('/tests/:testId/submit',      authorize, authenticateRole(['student']),  testController.submitTest);

// ── TASK (CODE SUBMISSION) ROUTES ─────────────────────────────────────────────
router.post('/sessions/:sessionId/tasks',          authorize, authenticateRole(['tutor']),    taskController.createTask);
router.get('/sessions/:sessionId/tasks',           authorize,                                 taskController.getTaskBySession);
router.get('/courses/:courseId/tasks',              authorize,                                 taskController.getTasksByCourse);
router.delete('/tasks/:taskId',                    authorize, authenticateRole(['tutor']),    taskController.deleteTask);
router.get('/tasks/:taskId/submissions',           authorize, authenticateRole(['tutor']),    taskController.getTaskSubmissions);
router.get('/sessions/:sessionId/student-task',    authorize, authenticateRole(['student']),  taskController.getStudentTask);
router.post('/tasks/:taskId/submit',               authorize, authenticateRole(['student']),  taskController.submitTask);
router.post('/tasks/submissions/:submissionId/feedback', authorize, authenticateRole(['tutor']), taskController.addFeedback);

// ── ENROLLMENT ROUTES ─────────────────────────────────────────────────────────
// ⚠️ SPECIFIC routes MUST come BEFORE /:id parameterized routes

// Student: check enrollment status (BEFORE /:id)
router.get('/enrollments/check/:courseId', authorize, authenticateRole(['student']), enrollmentController.checkStudentEnrollment);

// Student: verify code and activate enrollment
router.post('/enrollments/verify', authorize, authenticateRole(['student']), enrollmentController.verifyAndActivateEnrollment);

// Student: verify combo code and enroll in combo courses
router.post('/enrollments/combo-verify', authorize, authenticateRole(['student']), comboController.verifyComboEnrollment);

// Tutor: create enrollment code
router.post('/enrollments/create-code', authorize, authenticateRole(['tutor']), enrollmentController.createStudentEnrollmentCode);

// Tutor: get all enrollments
router.get('/enrollments', authorize, authenticateRole(['tutor']), enrollmentController.getAllEnrollments);

// Tutor: /:id routes LAST
router.get('/enrollments/:id',    authorize, authenticateRole(['tutor']), enrollmentController.getEnrollmentById);
router.put('/enrollments/:id',    authorize, authenticateRole(['tutor']), enrollmentController.updateEnrollment);
router.delete('/enrollments/:id', authorize, authenticateRole(['tutor']), enrollmentController.deleteEnrollment);

// ── NOTIFICATION ROUTES ───────────────────────────────────────────────────────
// Tutor: get recent verified enrollments as notifications
router.get('/notifications', authorize, authenticateRole(['tutor']), enrollmentController.getTutorNotifications);

// ── PROGRESS ROUTES ───────────────────────────────────────────────────────────
router.get('/students/me/progress/:courseId',            authorize, authenticateRole(['student']), progressController.getMyProgress);
router.get('/tutor/courses/:courseId/students-progress', authorize, authenticateRole(['tutor']),   progressController.getCourseStudentsProgress);

// ── CERTIFICATE ROUTES ────────────────────────────────────────────────────────
router.get('/certificates/me',                   authorize, authenticateRole(['student']), certificateController.getMyCertificates);
router.get('/certificates/course/:courseId',     authorize, authenticateRole(['student']), certificateController.getCourseCertificate);
router.get('/certificates/verify/:certificateId',                                          certificateController.verifyCertificate);

// ── ASSIGNMENT ROUTES ─────────────────────────────────────────────────────────
// ⚠️ Sub-path routes MUST come BEFORE bare /:assignmentId routes

// Course-level assignment routes
router.post('/courses/:courseId/assignment', authorize, authenticateRole(['tutor']),  verifyCourseOwnership,  assignmentController.createAssignment);
router.get('/courses/:courseId/assignment',  authorize,                                                        assignmentController.getAssignmentByCourse);

// Student: submit (BEFORE /:assignmentId)
router.post('/assignments/:assignmentId/submit',       authorize, authenticateRole(['student']), assignmentController.submitAssignment);

// Student: view own submission (BEFORE /:assignmentId)
router.get('/assignments/:assignmentId/my-submission', authorize, authenticateRole(['student']), assignmentController.getMySubmission);

// Tutor: list all submissions (BEFORE /:assignmentId)
router.get('/assignments/:assignmentId/submissions',   authorize, authenticateRole(['tutor']),   assignmentController.getSubmissionsByAssignment);

// Bare /:assignmentId routes LAST
router.get('/assignments/:assignmentId',    authorize,                               assignmentController.getAssignmentById);
router.put('/assignments/:assignmentId',    authorize, authenticateRole(['tutor']),  assignmentController.updateAssignment);
router.delete('/assignments/:assignmentId', authorize, authenticateRole(['tutor']),  assignmentController.deleteAssignment);

// Tutor: review a submission
router.put('/submissions/:submissionId/review', authorize, authenticateRole(['tutor']), assignmentController.reviewSubmission);

export default router;