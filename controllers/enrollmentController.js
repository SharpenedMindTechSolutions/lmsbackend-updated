import crypto from 'crypto';
import Enrollment from '../models/EnrollmentModel.js';
import Course from '../models/CourseModel.js';
import Student from '../models/studentModel.js';

// ── createStudentEnrollmentCode ────────────────────────────────
// POST /enrollments/create-code  |  Tutor only
// Request  body : { studentName, studentId, courseId }
// Response      : { studentId, studentName, courseId, courseName, enrollmentCode }
const createStudentEnrollmentCode = async (req, res) => {
    try {
        const { studentName, studentId, courseId } = req.body;

        // Validate required fields
        if (!studentName || !studentId || !courseId) {
            return res.status(400).json({
                message: 'studentName, studentId and courseId are required'
            });
        }

        // Verify course exists and belongs to this tutor
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden: You do not own this course' });
        }

        // Verify student exists
        const student = await Student.findById(studentId).select('name');
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // Prevent duplicate enrollment for the same student + course
        const existing = await Enrollment.findOne({ studentId, courseId });
        if (existing) {
            return res.status(400).json({
                message: 'An enrollment code already exists for this student in this course'
            });
        }

        // Auto-generate unique 8-character uppercase enrollment code
        const enrollmentCode = crypto.randomBytes(4).toString('hex').toUpperCase();

        // Save enrollment record with the generated code
        await Enrollment.create({
            studentId,
            courseId,
            studentName: student.name,
            enrollmentCode,
            message: ''
        });

        return res.status(201).json({
            message: 'Successfully created an enrollment code for this student',
            studentId,
            studentName: student.name,
            courseId,
            courseName: course.title,
            enrollmentCode
        });
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'An enrollment code already exists for this student in this course' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── getAllEnrollments ──────────────────────────────────────────
// GET /enrollments  |  Tutor only
const getAllEnrollments = async (req, res) => {
    try {
        // Only return enrollments for courses owned by this tutor
        const courses = await Course.find({ tutorId: req.user.id }).select('_id');
        const courseIds = courses.map(c => c._id);

        const enrollments = await Enrollment.find({ courseId: { $in: courseIds } })
            .populate('studentId', 'name email')
            .populate('courseId', 'title')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: 'Enrollments fetched successfully',
            total: enrollments.length,
            enrollments
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── getEnrollmentById ──────────────────────────────────────────
// GET /enrollments/:id  |  Tutor only
const getEnrollmentById = async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id)
            .populate('studentId', 'name email')
            .populate('courseId', 'title');

        if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

        return res.status(200).json({
            message: 'Enrollment fetched successfully',
            enrollment
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── updateEnrollment ───────────────────────────────────────────
// PUT /enrollments/:id  |  Tutor only
// Updatable fields: enrollmentCode, message
const updateEnrollment = async (req, res) => {
    try {
        const { enrollmentCode, message } = req.body;

        const enrollment = await Enrollment.findById(req.params.id);
        if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

        // Verify tutor owns the course tied to this enrollment
        const course = await Course.findById(enrollment.courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden: You do not own this course' });
        }

        if (enrollmentCode !== undefined) enrollment.enrollmentCode = enrollmentCode.toUpperCase();
        if (message        !== undefined) enrollment.message        = message;

        await enrollment.save();

        return res.status(200).json({
            message: 'Enrollment updated successfully',
            enrollment
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── deleteEnrollment ───────────────────────────────────────────
// DELETE /enrollments/:id  |  Tutor only
const deleteEnrollment = async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id);
        if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

        // Verify tutor owns the course tied to this enrollment
        const course = await Course.findById(enrollment.courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden: You do not own this course' });
        }

        await enrollment.deleteOne();

        return res.status(200).json({ message: 'Enrollment deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


// ── verifyAndActivateEnrollment ────────────────────────────────
// POST /enrollments/verify  |  Student only
// Body: { courseId, enrollmentCode }
// Finds the enrollment record for this student+course, checks the code,
// and marks it as verified so the student can access the course.
const verifyAndActivateEnrollment = async (req, res) => {
    try {
        const { courseId, enrollmentCode } = req.body;
        const studentId = req.user.id;

        if (!courseId || !enrollmentCode) {
            return res.status(400).json({ message: 'courseId and enrollmentCode are required' });
        }

        // Find enrollment pre-created by the tutor for this student+course
        const enrollment = await Enrollment.findOne({ studentId, courseId });

        if (!enrollment) {
            return res.status(404).json({
                message: 'No enrollment found for this course. Please ask your tutor to generate a code for you.'
            });
        }

        // Already verified — let them through without re-checking code
        if (enrollment.isVerified) {
            return res.status(200).json({
                message: 'Already enrolled in this course',
                enrollment,
                alreadyEnrolled: true
            });
        }

        // Check the code (case-insensitive)
        if (enrollment.enrollmentCode.toUpperCase() !== enrollmentCode.trim().toUpperCase()) {
            return res.status(400).json({ message: 'Invalid enrollment code. Please check and try again.' });
        }

        // Mark as verified
        enrollment.isVerified = true;
        enrollment.verifiedAt = new Date();
        await enrollment.save();

        return res.status(200).json({
            message: 'Enrollment verified successfully! Welcome to the course.',
            enrollment,
            alreadyEnrolled: false
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── checkStudentEnrollment ─────────────────────────────────────
// GET /enrollments/check/:courseId  |  Student only
// Returns whether the authenticated student is enrolled & verified for a course.
const checkStudentEnrollment = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { courseId } = req.params;

        const enrollment = await Enrollment.findOne({ studentId, courseId });

        if (!enrollment) {
            return res.status(200).json({ enrolled: false, verified: false });
        }

        return res.status(200).json({
            enrolled: true,
            verified: enrollment.isVerified,
            enrollment
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};



// ── getTutorNotifications ──────────────────────────────────────
// GET /notifications  |  Tutor only
// Returns recent student enrollments (verified) for this tutor's courses
const getTutorNotifications = async (req, res) => {
    try {
        const tutorId = req.user.id;

        // Get all courses owned by this tutor
        const courses = await Course.find({ tutorId }).select('_id title');
        const courseIds = courses.map(c => c._id);

        // Get recently verified enrollments for those courses (last 30)
        const enrollments = await Enrollment.find({
            courseId: { $in: courseIds },
            isVerified: true
        })
            .populate('studentId', 'name email')
            .populate('courseId', 'title')
            .sort({ verifiedAt: -1 })
            .limit(30);

        const notifications = enrollments.map(e => ({
            _id: e._id,
            type: 'enrollment',
            message: `${e.studentId?.name || e.studentName} enrolled in "${e.courseId?.title}"`,
            studentName: e.studentId?.name || e.studentName,
            courseName: e.courseId?.title,
            createdAt: e.verifiedAt || e.updatedAt,
            read: false
        }));

        return res.status(200).json({ notifications });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// NOTE: verifyComboEnrollment moved to controllers/comboController.js

export default {
    createStudentEnrollmentCode,
    getAllEnrollments,
    getEnrollmentById,
    updateEnrollment,
    deleteEnrollment,
    verifyAndActivateEnrollment,
    checkStudentEnrollment,
    getTutorNotifications,
};