import Assignment from '../models/AssignmentModel.js';
import AssignmentSubmission from '../models/AssignmentSubmissionModel.js';
import Course from '../models/CourseModel.js';
import Enrollment from '../models/EnrollmentModel.js';
import Tutor from '../models/tutorModel.js';
import Student from '../models/studentModel.js';
import { sendAssignmentSubmissionNotification } from '../email/sendEmail.js';
import { recordActivity } from '../utils/streakEngine.js';

// ── createAssignment ──────────────────────────────────────────────────────────
// POST /courses/:courseId/assignment  |  Tutor only
// Body: { title, description, dueDate? }
const createAssignment = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, description, dueDate } = req.body;

        if (!title || !description) {
            return res.status(400).json({ message: 'Title and description are required' });
        }

        // Verify the course exists and belongs to this tutor
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden: You do not own this course' });
        }

        // Only one assignment allowed per course
        const existing = await Assignment.findOne({ courseId });
        if (existing) {
            return res.status(400).json({
                message: 'An assignment already exists for this course. Update it instead.',
                assignmentId: existing._id
            });
        }

        const assignment = await Assignment.create({
            courseId,
            tutorId: req.user.id,
            title,
            description,
            dueDate: dueDate || null
        });

        return res.status(201).json({
            message: 'Assignment created successfully',
            assignment
        });
    } catch (error) {
        console.error('createAssignment error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── getAssignmentByCourse ─────────────────────────────────────────────────────
// GET /courses/:courseId/assignment  |  Tutor + enrolled Student
const getAssignmentByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        const assignment = await Assignment.findOne({ courseId })
            .populate('courseId', 'title')
            .populate('tutorId', 'name email');

        if (!assignment) {
            return res.status(404).json({ message: 'No assignment found for this course' });
        }

        return res.status(200).json({
            message: 'Assignment fetched successfully',
            assignment
        });
    } catch (error) {
        console.error('getAssignmentByCourse error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── getAssignmentById ─────────────────────────────────────────────────────────
// GET /assignments/:assignmentId  |  Tutor + enrolled Student
const getAssignmentById = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.assignmentId)
            .populate('courseId', 'title')
            .populate('tutorId', 'name email');

        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        return res.status(200).json({
            message: 'Assignment fetched successfully',
            assignment
        });
    } catch (error) {
        console.error('getAssignmentById error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── updateAssignment ──────────────────────────────────────────────────────────
// PUT /assignments/:assignmentId  |  Tutor only (owner)
const updateAssignment = async (req, res) => {
    try {
        const { title, description, dueDate } = req.body;

        const assignment = await Assignment.findById(req.params.assignmentId);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        if (assignment.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden: You do not own this assignment' });
        }

        if (title)       assignment.title       = title;
        if (description) assignment.description = description;
        if (dueDate !== undefined) assignment.dueDate = dueDate;

        await assignment.save();

        return res.status(200).json({
            message: 'Assignment updated successfully',
            assignment
        });
    } catch (error) {
        console.error('updateAssignment error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── deleteAssignment ──────────────────────────────────────────────────────────
// DELETE /assignments/:assignmentId  |  Tutor only (owner)
const deleteAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.assignmentId);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        if (assignment.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden: You do not own this assignment' });
        }

        await Assignment.findByIdAndDelete(req.params.assignmentId);
        // Cascade-delete all submissions for this assignment
        await AssignmentSubmission.deleteMany({ assignmentId: req.params.assignmentId });

        return res.status(200).json({ message: 'Assignment and all submissions deleted successfully' });
    } catch (error) {
        console.error('deleteAssignment error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── submitAssignment ──────────────────────────────────────────────────────────
// POST /assignments/:assignmentId/submit  |  Student only
// Body: { fileUrl, fileName, fileType }  (pdf | doc | docx | zip)
const submitAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const { fileUrl, fileName, fileType } = req.body;

        if (!fileUrl || !fileName || !fileType) {
            return res.status(400).json({ message: 'fileUrl, fileName and fileType are required' });
        }

        // Validate file type
        const allowed = ['pdf', 'doc', 'docx', 'zip'];
        if (!allowed.includes(fileType.toLowerCase())) {
            return res.status(400).json({
                message: `Invalid file type. Allowed types: ${allowed.join(', ')}`
            });
        }

        // Verify assignment exists
        const assignment = await Assignment.findById(assignmentId).populate('courseId', 'title tutorId');
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        // Verify student is enrolled in the course
        const enrollment = await Enrollment.findOne({
            studentId: req.user.id,
            courseId: assignment.courseId._id,
            isVerified: true
        });
        if (!enrollment) {
            return res.status(403).json({
                message: 'Forbidden: You are not enrolled in this course'
            });
        }

        // Check for duplicate submission
        const existingSubmission = await AssignmentSubmission.findOne({
            assignmentId,
            studentId: req.user.id
        });
        if (existingSubmission) {
            return res.status(400).json({
                message: 'You have already submitted this assignment',
                submissionId: existingSubmission._id
            });
        }

        // Get student details for notification
        const student = await Student.findById(req.user.id).select('name');

        const submission = await AssignmentSubmission.create({
            assignmentId,
            courseId: assignment.courseId._id,
            studentId: req.user.id,
            studentName: student.name,
            fileUrl,
            fileName,
            fileType: fileType.toLowerCase()
        });

        // ── Send email notification to the tutor ──────────────────────────────
        try {
            const tutor = await Tutor.findById(assignment.tutorId).select('name email');
            if (tutor?.email) {
                await sendAssignmentSubmissionNotification({
                    tutorEmail:      tutor.email,
                    tutorName:       tutor.name,
                    studentName:     student.name,
                    courseTitle:     assignment.courseId.title,
                    assignmentTitle: assignment.title,
                    fileName,
                    fileType,
                    submittedAt:     submission.createdAt
                });
            }
        } catch (mailError) {
            // Notification failure should NOT break the submission response
            console.error('Assignment submission email error:', mailError.message);
        }

        // Award XP & Streak for assignment submission
        let gamificationResult = null;
        try {
            gamificationResult = await recordActivity(req.user.id, {
                activityType: 'assignment',
                referenceId: assignment._id,
                title: `Assignment Submitted: ${assignment.title}`,
                xpAmount: 40
            });
        } catch (err) {
            console.error('Streak engine error on assignment submission:', err.message);
        }

        return res.status(201).json({
            message: 'Assignment submitted successfully. Your tutor has been notified.',
            submission,
            gamification: gamificationResult
        });
    } catch (error) {
        console.error('submitAssignment error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── getSubmissionsByAssignment ────────────────────────────────────────────────
// GET /assignments/:assignmentId/submissions  |  Tutor only
const getSubmissionsByAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.assignmentId);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        if (assignment.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden: You do not own this assignment' });
        }

        const submissions = await AssignmentSubmission.find({ assignmentId: req.params.assignmentId })
            .populate('studentId', 'name email')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: 'Submissions fetched successfully',
            total: submissions.length,
            submissions
        });
    } catch (error) {
        console.error('getSubmissionsByAssignment error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── getMySubmission ───────────────────────────────────────────────────────────
// GET /assignments/:assignmentId/my-submission  |  Student only
const getMySubmission = async (req, res) => {
    try {
        const submission = await AssignmentSubmission.findOne({
            assignmentId: req.params.assignmentId,
            studentId:    req.user.id
        }).populate('assignmentId', 'title description dueDate');

        if (!submission) {
            return res.status(404).json({ message: 'No submission found for this assignment' });
        }

        return res.status(200).json({
            message: 'Your submission fetched successfully',
            submission
        });
    } catch (error) {
        console.error('getMySubmission error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── reviewSubmission ──────────────────────────────────────────────────────────
// PUT /submissions/:submissionId/review  |  Tutor only
// Body: { grade?, feedback? }
const reviewSubmission = async (req, res) => {
    try {
        const { grade, feedback } = req.body;

        if (!grade && !feedback) {
            return res.status(400).json({ message: 'At least grade or feedback is required' });
        }

        const submission = await AssignmentSubmission.findById(req.params.submissionId)
            .populate('assignmentId', 'tutorId');

        if (!submission) return res.status(404).json({ message: 'Submission not found' });

        // Only the assignment owner (tutor) can review
        if (submission.assignmentId.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden: You do not own this assignment' });
        }

        if (grade)    submission.grade      = grade;
        if (feedback) submission.feedback   = feedback;
        submission.reviewedAt = new Date();

        await submission.save();

        return res.status(200).json({
            message: 'Submission reviewed successfully',
            submission
        });
    } catch (error) {
        console.error('reviewSubmission error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export default {
    createAssignment,
    getAssignmentByCourse,
    getAssignmentById,
    updateAssignment,
    deleteAssignment,
    submitAssignment,
    getSubmissionsByAssignment,
    getMySubmission,
    reviewSubmission
};
