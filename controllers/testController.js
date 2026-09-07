import Test from '../models/TestModel.js';
import Session from '../models/SessionModel.js';
import Progress from '../models/ProgressModel.js';
import Enrollment from '../models/EnrollmentModel.js';
import Course from '../models/CourseModel.js';
import { recordActivity } from '../utils/streakEngine.js';
import { checkAndGenerateCertificate } from './certificateController.js';

// ── createTest ─────────────────────────────────────────────────
// POST /sessions/:sessionId/tests  |  Tutor only
const createTest = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { questions } = req.body;

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ message: 'questions array is required and must not be empty' });
        }

        for (const [i, q] of questions.entries()) {
            if (!q.questionText || !q.options || !q.correctAnswer) {
                return res.status(400).json({
                    message: `Question at index ${i} must have questionText, options, and correctAnswer`
                });
            }
            if (!Array.isArray(q.options) || q.options.length < 2) {
                return res.status(400).json({
                    message: `Question at index ${i} must have at least 2 options`
                });
            }
            if (!q.options.includes(q.correctAnswer)) {
                return res.status(400).json({
                    message: `correctAnswer at index ${i} must be one of the provided options`
                });
            }
        }

        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });

        // Verify tutor owns the course that contains this session
        const course = await Course.findById(session.courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });
        if (course.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to create a test for this session' });
        }

        const existing = await Test.findOne({ sessionId });
        if (existing) {
            return res.status(400).json({ message: 'A test already exists for this session. Update it instead.' });
        }

        const test = await Test.create({ sessionId, questions });

        return res.status(201).json({
            message: 'Test created successfully',
            test
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── getTestBySession ───────────────────────────────────────────
// GET /sessions/:sessionId/tests  |  Tutor (any) | Student (enrolled & verified only)
const getTestBySession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });

        // Students must have a verified enrollment
        if (req.user.role?.toLowerCase() === 'student') {
            const enrollment = await Enrollment.findOne({
                studentId: req.user.id,
                courseId: session.courseId,
                isVerified: true
            });
            if (!enrollment) {
                return res.status(403).json({ message: 'You must be enrolled and verified to access this test' });
            }
        }

        const test = await Test.findOne({ sessionId });
        if (!test) return res.status(404).json({ message: 'No test found for this session' });

        // Hide correct answers for students
        if (req.user.role?.toLowerCase() === 'student') {
            const sanitized = test.questions.map(q => ({
                _id: q._id,
                questionText: q.questionText,
                options: q.options
            }));
            return res.status(200).json({
                message: 'Test fetched successfully',
                testId: test._id,
                sessionId: test.sessionId,
                questions: sanitized
            });
        }

        return res.status(200).json({
            message: 'Test fetched successfully',
            test
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── getTestById ────────────────────────────────────────────────
// GET /tests/:testId  |  Tutor (any) | Student (enrolled & verified only)
const getTestById = async (req, res) => {
    try {
        const { testId } = req.params;

        const test = await Test.findById(testId).populate('sessionId', 'sessionTitle videoTitle courseId');
        if (!test) return res.status(404).json({ message: 'Test not found' });

        // Students must have a verified enrollment for the course this test belongs to
        if (req.user.role?.toLowerCase() === 'student') {
            const courseId = test.sessionId?.courseId;
            const enrollment = await Enrollment.findOne({
                studentId: req.user.id,
                courseId,
                isVerified: true
            });
            if (!enrollment) {
                return res.status(403).json({ message: 'You must be enrolled and verified to access this test' });
            }
        }

        // Hide correct answers for students
        if (req.user.role?.toLowerCase() === 'student') {
            const sanitized = test.questions.map(q => ({
                _id: q._id,
                questionText: q.questionText,
                options: q.options
            }));
            return res.status(200).json({
                message: 'Test fetched successfully',
                testId: test._id,
                sessionId: test.sessionId,
                questions: sanitized
            });
        }

        return res.status(200).json({
            message: 'Test fetched successfully',
            test
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── updateTest ─────────────────────────────────────────────────
// PUT /tests/:testId  |  Tutor only (course owner)
const updateTest = async (req, res) => {
    try {
        const { testId } = req.params;
        const { questions } = req.body;

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ message: 'questions array is required and must not be empty' });
        }

        // Validate each question
        for (const [i, q] of questions.entries()) {
            if (!q.questionText || !q.options || !q.correctAnswer) {
                return res.status(400).json({
                    message: `Question at index ${i} must have questionText, options, and correctAnswer`
                });
            }
            if (!Array.isArray(q.options) || q.options.length < 2) {
                return res.status(400).json({
                    message: `Question at index ${i} must have at least 2 options`
                });
            }
            if (!q.options.includes(q.correctAnswer)) {
                return res.status(400).json({
                    message: `correctAnswer at index ${i} must be one of the provided options`
                });
            }
        }

        const test = await Test.findById(testId);
        if (!test) return res.status(404).json({ message: 'Test not found' });

        // Verify tutor owns the course
        const session = await Session.findById(test.sessionId);
        const course = await Course.findById(session.courseId);
        if (course.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to update this test' });
        }

        test.questions = questions;
        await test.save();

        return res.status(200).json({
            message: 'Test updated successfully',
            test
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── deleteTest ─────────────────────────────────────────────────
// DELETE /tests/:testId  |  Tutor only (course owner)
const deleteTest = async (req, res) => {
    try {
        const { testId } = req.params;

        const test = await Test.findById(testId);
        if (!test) return res.status(404).json({ message: 'Test not found' });

        // Verify tutor owns the course
        const session = await Session.findById(test.sessionId);
        const course = await Course.findById(session.courseId);
        if (course.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to delete this test' });
        }

        await Test.findByIdAndDelete(testId);

        return res.status(200).json({ message: 'Test deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── submitTest ─────────────────────────────────────────────────
// POST /tests/:testId/submit  |  Student only
const submitTest = async (req, res) => {
    try {
        const { testId } = req.params;
        const { answers } = req.body;

        if (!answers || !Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ message: 'answers array is required' });
        }

        const test = await Test.findById(testId);
        if (!test) return res.status(404).json({ message: 'Test not found' });

        const session = await Session.findById(test.sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });

        const enrollment = await Enrollment.findOne({
            studentId: req.user.id,
            courseId: session.courseId
        });
        if (!enrollment) {
            return res.status(403).json({ message: 'You are not enrolled in this course' });
        }

        // Calculate score
        let correct = 0;
        const breakdown = test.questions.map((q) => {
            const studentAnswer = answers.find(a => a.questionId === q._id.toString());
            const isCorrect = studentAnswer?.answer === q.correctAnswer;
            if (isCorrect) correct++;
            return {
                questionId: q._id,
                questionText: q.questionText,
                yourAnswer: studentAnswer?.answer ?? null,
                correctAnswer: q.correctAnswer,
                isCorrect
            };
        });

        const score = Math.round((correct / test.questions.length) * 100);

        let progress = await Progress.findOne({
            studentId: req.user.id,
            courseId: session.courseId
        });

        if (!progress) {
            progress = new Progress({
                studentId: req.user.id,
                courseId: session.courseId
            });
        }

        const existingScore = progress.testScores.find(
            (ts) => ts.sessionId.toString() === session._id.toString()
        );
        if (existingScore) {
            existingScore.score = score;
        } else {
            progress.testScores.push({ sessionId: session._id, score });
        }

        if (!progress.completedSessions.includes(session._id)) {
            progress.completedSessions.push(session._id);
        }

        const totalScores = progress.testScores.map(ts => ts.score);
        progress.overallScore = totalScores.length
            ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length)
            : 0;

        const allSessions = await Session.find({ courseId: session.courseId });
        const allCompleted = allSessions.every(s =>
            progress.completedSessions.map(id => id.toString()).includes(s._id.toString())
        );
        progress.completionStatus = allCompleted ? 'completed' : 'in-progress';

        await progress.save();

        if (allCompleted) {
            await checkAndGenerateCertificate(req.user.id, session.courseId);
        }

        // Award XP & Streak for taking the test
        let gamificationResult = null;
        if (score >= 50) {
            try {
                gamificationResult = await recordActivity(req.user.id, {
                    activityType: 'test',
                    referenceId: test._id,
                    title: `Session Quiz Passed (${score}%)`,
                    xpAmount: 30
                });
            } catch (err) {
                console.error('Streak engine error on test completion:', err.message);
            }
        }

        return res.status(200).json({
            message: 'Test submitted successfully',
            score,
            correct,
            total: test.questions.length,
            breakdown,
            progress: {
                overallScore: progress.overallScore,
                completionStatus: progress.completionStatus,
                completedSessions: progress.completedSessions.length,
                totalSessions: allSessions.length
            },
            gamification: gamificationResult
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export default {
    createTest,
    getTestBySession,
    getTestById,
    updateTest,
    deleteTest,
    submitTest
};