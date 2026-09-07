import Session from '../models/SessionModel.js';
import Course from '../models/CourseModel.js';
import Test from '../models/TestModel.js';
import Enrollment from '../models/EnrollmentModel.js';

// ── addSession ─────────────────────────────────────────────────
// POST /courses/:courseId/sessions  |  Tutor only
const addSession = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { sessionTitle, videoTitle, videoDriveLink, order } = req.body;

        if (!sessionTitle || !videoTitle || !videoDriveLink) {
            return res.status(400).json({
                message: 'sessionTitle, videoTitle, and videoDriveLink are required'
            });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Only the course owner can add sessions
        if (course.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to add sessions to this course' });
        }

        const session = await Session.create({
            courseId,
            sessionTitle,
            videoTitle,
            videoDriveLink,
            order: order ?? 0
        });

        return res.status(201).json({
            message: 'Session added successfully',
            session
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── getSessionsByCourse ────────────────────────────────────────
// GET /courses/:courseId/sessions  |  Tutor (any) | Student (enrolled & verified only)
const getSessionsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Students must have a verified enrollment to view sessions
        if (req.user.role?.toLowerCase() === 'student') {
            const enrollment = await Enrollment.findOne({
                studentId: req.user.id,
                courseId,
                isVerified: true
            });
            if (!enrollment) {
                return res.status(403).json({ message: 'You must be enrolled and verified to access sessions for this course' });
            }
        }

        const sessions = await Session.find({ courseId }).sort({ order: 1, createdAt: 1 });

        return res.status(200).json({
            message: 'Sessions fetched successfully',
            total: sessions.length,
            sessions
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const getSessionById = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await Session.findById(sessionId).populate('courseId', 'title description');
        if (!session) return res.status(404).json({ message: 'Session not found' });

        // Students must have a verified enrollment to view the session
        if (req.user.role?.toLowerCase() === 'student') {
            const enrollment = await Enrollment.findOne({
                studentId: req.user.id,
                courseId: session.courseId._id ?? session.courseId,
                isVerified: true
            });
            if (!enrollment) {
                return res.status(403).json({ message: 'You must be enrolled and verified to access this session' });
            }
        }

        return res.status(200).json({
            message: 'Session fetched successfully',
            session
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── updateSession ──────────────────────────────────────────────
// PUT /sessions/:sessionId  |  Tutor only (course owner)
const updateSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { sessionTitle, videoTitle, videoDriveLink, order } = req.body;

        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });

        // verify tutor owns the course
        const course = await Course.findById(session.courseId);
        if (course.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to update this session' });
        }

        if (sessionTitle)    session.sessionTitle  = sessionTitle;
        if (videoTitle)      session.videoTitle    = videoTitle;
        if (videoDriveLink)  session.videoDriveLink = videoDriveLink;
        if (order !== undefined) session.order     = order;

        await session.save();

        return res.status(200).json({
            message: 'Session updated successfully',
            session
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── deleteSession ──────────────────────────────────────────────
// DELETE /sessions/:sessionId  |  Tutor only (course owner)
const deleteSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });

        // verify tutor owns the course
        const course = await Course.findById(session.courseId);
        if (course.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to delete this session' });
        }

        await Session.findByIdAndDelete(sessionId);

        return res.status(200).json({ message: 'Session deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export default {
    addSession,
    getSessionsByCourse,
    getSessionById,
    updateSession,
    deleteSession
};
