import VideoProgress from '../models/VideoProgressModel.js';
import Enrollment from '../models/EnrollmentModel.js';
import Progress from '../models/ProgressModel.js';
import { recordActivity } from '../utils/streakEngine.js';
import Session from '../models/SessionModel.js';
import Task from '../models/TaskModel.js';
import TaskSubmission from '../models/TaskSubmissionModel.js';
import { checkAndGenerateCertificate } from './certificateController.js';

/**
 * POST /api/lms/sessions/:sessionId/video-progress
 * Body: { courseId, watchedPercent }
 * Updates watchedPercent; marks isCompleted if >= 90%.
 * Also updates the Progress.completedSessions array if newly completed.
 */
const updateVideoProgress = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { courseId, watchedPercent } = req.body;
        const studentId = req.user.id;

        if (!courseId) return res.status(400).json({ message: 'courseId is required' });
        if (watchedPercent === undefined || watchedPercent === null) {
            return res.status(400).json({ message: 'watchedPercent is required' });
        }

        // Verify enrollment
        const enrollment = await Enrollment.findOne({ studentId, courseId });
        if (!enrollment) return res.status(403).json({ message: 'Not enrolled in this course' });

        const pct = Math.min(100, Math.max(0, Number(watchedPercent)));

        let vp = await VideoProgress.findOne({ studentId, sessionId });
        const wasCompleted = vp?.isCompleted || false;

        if (!vp) {
            vp = new VideoProgress({ studentId, sessionId, courseId });
        }

        // Only advance, never go backwards (handles seek back)
        if (pct > vp.watchedPercent) vp.watchedPercent = pct;

        // Mark complete at 90%
        if (!vp.isCompleted && vp.watchedPercent >= 90) {
            vp.isCompleted = true;
            vp.completedAt = new Date();
        }

        await vp.save();

        // If newly completed, update the Progress collection and award XP / streak
        let gamificationResult = null;
        if (vp.isCompleted && !wasCompleted) {
            let progress = await Progress.findOneAndUpdate(
                { studentId, courseId },
                { $addToSet: { completedSessions: sessionId } },
                { upsert: true, new: true }
            );

            // Check for course completion (sessions + tasks)
            const allSessions = await Session.find({ courseId });
            const allCompleted = allSessions.every(s =>
                progress.completedSessions.map(id => id.toString()).includes(s._id.toString())
            );

            // Also check all tasks are submitted
            const allTasks = await Task.find({ courseId });
            const allTasksCompleted = allTasks.length === 0 || allTasks.every(t =>
                progress.completedTasks.map(id => id.toString()).includes(t._id.toString())
            );

            if (allCompleted && allTasksCompleted && progress.completionStatus !== 'completed') {
                progress.completionStatus = 'completed';
                await progress.save();
                
                // Generate certificate
                await checkAndGenerateCertificate(studentId, courseId);
            }

            try {
                gamificationResult = await recordActivity(studentId, {
                    activityType: 'video',
                    referenceId: sessionId,
                    title: 'Course Session Video Completed',
                    xpAmount: 20
                });
            } catch (err) {
                console.error('Streak engine error on video completion:', err.message);
            }
        }

        return res.status(200).json({
            message: 'Video progress updated',
            watchedPercent: vp.watchedPercent,
            isCompleted: vp.isCompleted,
            gamification: gamificationResult
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * GET /api/lms/sessions/:sessionId/video-progress
 * Returns current video progress for the authenticated student.
 */
const getVideoProgress = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const studentId = req.user.id;

        const vp = await VideoProgress.findOne({ studentId, sessionId });
        return res.status(200).json({
            watchedPercent: vp?.watchedPercent || 0,
            isCompleted: vp?.isCompleted || false
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export default { updateVideoProgress, getVideoProgress };
