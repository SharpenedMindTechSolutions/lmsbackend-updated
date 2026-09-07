import Progress from '../models/ProgressModel.js';
import Enrollment from '../models/EnrollmentModel.js';
import Session from '../models/SessionModel.js';
import Course from '../models/CourseModel.js';

// ── getMyProgress ──────────────────────────────────────────────
// GET /students/me/progress/:courseId  |  Student only
const getMyProgress = async (req, res) => {
    try {
        const { courseId } = req.params;

        // Verify enrollment
        const enrollment = await Enrollment.findOne({
            studentId: req.user.id,
            courseId
        });
        if (!enrollment) {
            return res.status(403).json({ message: 'You are not enrolled in this course' });
        }

        const progress = await Progress.findOne({
            studentId: req.user.id,
            courseId
        })
            .populate('completedSessions', 'sessionTitle videoTitle')
            .populate('testScores.sessionId', 'sessionTitle');

        if (!progress) {
            return res.status(404).json({ message: 'Progress record not found' });
        }

        const totalSessions = await Session.countDocuments({ courseId });

        return res.status(200).json({
            message: 'Progress fetched successfully',
            progress: {
                courseId,
                completedSessions: progress.completedSessions,
                totalSessions,
                testScores: progress.testScores,
                overallScore: progress.overallScore,
                completionStatus: progress.completionStatus
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── getCourseStudentsProgress ──────────────────────────────────
// GET /tutor/courses/:courseId/students-progress  |  Tutor only
const getCourseStudentsProgress = async (req, res) => {
    try {
        const { courseId } = req.params;

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Only the course owner tutor can view
        if (course.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to view this data' });
        }

        const totalSessions = await Session.countDocuments({ courseId });

        const progressList = await Progress.find({ courseId })
            .populate('studentId', 'name email phone')
            .populate('completedSessions', 'sessionTitle')
            .populate('testScores.sessionId', 'sessionTitle');

        const dashboard = progressList.map((p) => ({
            student: p.studentId,
            completedSessions: p.completedSessions.length,
            totalSessions,
            testScores: p.testScores,
            overallScore: p.overallScore,
            completionStatus: p.completionStatus
        }));

        return res.status(200).json({
            message: 'Student progress fetched successfully',
            courseId,
            totalEnrolled: dashboard.length,
            students: dashboard
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export default {
    getMyProgress,
    getCourseStudentsProgress
};
