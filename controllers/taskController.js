import Task from '../models/TaskModel.js';
import TaskSubmission from '../models/TaskSubmissionModel.js';
import Session from '../models/SessionModel.js';
import Progress from '../models/ProgressModel.js';
import Enrollment from '../models/EnrollmentModel.js';
import VideoProgress from '../models/VideoProgressModel.js';
import { checkAndGenerateCertificate } from './certificateController.js';

// ── TUTOR: Create a Task for a Session ──────────────────────────────────────
const createTask = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { title, description, instructions, taskType, courseId } = req.body;

        if (!title || !description) {
            return res.status(400).json({ message: 'Title and description are required' });
        }

        // Verify session exists
        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });

        const cid = courseId || session.courseId;

        // Check if a task already exists for this session
        const existing = await Task.findOne({ sessionId });
        if (existing) {
            return res.status(409).json({ message: 'A task already exists for this session. Edit or delete it first.' });
        }

        const task = new Task({
            courseId: cid,
            sessionId,
            title,
            description,
            instructions: instructions || '',
            taskType: taskType || 'code'
        });

        await task.save();
        return res.status(201).json({ message: 'Task created successfully', task });
    } catch (error) {
        console.error('createTask error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── TUTOR: Get Task by Session ──────────────────────────────────────────────
const getTaskBySession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const task = await Task.findOne({ sessionId });
        if (!task) return res.status(404).json({ message: 'No task found for this session' });
        return res.status(200).json({ task });
    } catch (error) {
        console.error('getTaskBySession error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── TUTOR: Get all Tasks for a Course ───────────────────────────────────────
const getTasksByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const tasks = await Task.find({ courseId }).populate('sessionId', 'sessionTitle');
        return res.status(200).json({ tasks });
    } catch (error) {
        console.error('getTasksByCourse error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── TUTOR: Delete a Task ────────────────────────────────────────────────────
const deleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findByIdAndDelete(taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        // Also remove submissions for this task
        await TaskSubmission.deleteMany({ taskId });
        return res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('deleteTask error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── TUTOR: View Student Submissions for a Task ──────────────────────────────
const getTaskSubmissions = async (req, res) => {
    try {
        const { taskId } = req.params;
        const submissions = await TaskSubmission.find({ taskId })
            .populate('studentId', 'name email')
            .populate('taskId', 'title')
            .populate('sessionId', 'sessionTitle')
            .sort({ submittedAt: -1 });

        return res.status(200).json({ submissions });
    } catch (error) {
        console.error('getTaskSubmissions error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── STUDENT: Get Task for a Session ─────────────────────────────────────────
const getStudentTask = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const studentId = req.user.id;

        const task = await Task.findOne({ sessionId });
        if (!task) return res.status(404).json({ message: 'No task for this session' });

        // Check if already submitted
        const submission = await TaskSubmission.findOne({ taskId: task._id, studentId });

        return res.status(200).json({
            task,
            submission: submission || null,
            isSubmitted: !!submission
        });
    } catch (error) {
        console.error('getStudentTask error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── STUDENT: Submit Task ────────────────────────────────────────────────────
const submitTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const studentId = req.user.id;
        const { submittedCode } = req.body;

        if (!submittedCode || !submittedCode.trim()) {
            return res.status(400).json({ message: 'Code cannot be empty' });
        }

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const { courseId, sessionId } = task;

        // Verify enrollment
        const enrollment = await Enrollment.findOne({ studentId, courseId });
        if (!enrollment) return res.status(403).json({ message: 'Not enrolled in this course' });

        // Verify session video is completed
        const vp = await VideoProgress.findOne({ studentId, sessionId });
        if (!vp || !vp.isCompleted) {
            return res.status(403).json({ message: 'Complete the session video before submitting the task' });
        }

        // Check for existing submission
        let submission = await TaskSubmission.findOne({ taskId, studentId });
        if (submission) {
            // Update existing submission
            submission.submittedCode = submittedCode;
            submission.submittedAt = new Date();
            submission.status = 'submitted';
            await submission.save();
        } else {
            // Create new submission
            submission = new TaskSubmission({
                taskId,
                studentId,
                courseId,
                sessionId,
                submittedCode,
                status: 'submitted',
                submittedAt: new Date()
            });
            await submission.save();
        }

        // Update Progress — add task to completedTasks
        let progress = await Progress.findOneAndUpdate(
            { studentId, courseId },
            { $addToSet: { completedTasks: taskId } },
            { upsert: true, new: true }
        );

        // Check for full course completion (all sessions + all tasks)
        const allSessions = await Session.find({ courseId });
        const allTasks = await Task.find({ courseId });

        const allSessionsCompleted = allSessions.every(s =>
            progress.completedSessions.map(id => id.toString()).includes(s._id.toString())
        );
        const allTasksCompleted = allTasks.length === 0 || allTasks.every(t =>
            progress.completedTasks.map(id => id.toString()).includes(t._id.toString())
        );

        if (allSessionsCompleted && allTasksCompleted && progress.completionStatus !== 'completed') {
            progress.completionStatus = 'completed';
            await progress.save();
            await checkAndGenerateCertificate(studentId, courseId);
        }

        return res.status(200).json({
            message: 'Task submitted successfully',
            submission
        });
    } catch (error) {
        console.error('submitTask error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
// ── TUTOR: Add Feedback to a Submission ──────────────────────────────────────
const addFeedback = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { feedback } = req.body;

        const submission = await TaskSubmission.findById(submissionId);
        if (!submission) return res.status(404).json({ message: 'Submission not found' });

        submission.feedback = feedback || '';
        submission.status = 'reviewed';
        await submission.save();

        return res.status(200).json({ message: 'Feedback saved successfully', submission });
    } catch (error) {
        console.error('addFeedback error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export default {
    createTask,
    getTaskBySession,
    getTasksByCourse,
    deleteTask,
    getTaskSubmissions,
    getStudentTask,
    submitTask,
    addFeedback
};
