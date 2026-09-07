import Course from '../models/CourseModel.js';
import Session from '../models/SessionModel.js';
import Enrollment from '../models/EnrollmentModel.js';
import Progress from '../models/ProgressModel.js';

// ── createCourse ───────────────────────────────────────────────
// POST /courses  |  Tutor only
const createCourse = async (req, res) => {
    try {
        const { title, description, isPaid, price } = req.body;

        if (!title || !description) {
            return res.status(400).json({ message: 'Title and description are required' });
        }

        const course = await Course.create({
            title,
            description,
            isPaid: isPaid || false,
            price: price || 0,
            tutorId: req.user.id
        });

        return res.status(201).json({
            message: 'Course created successfully',
            course
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── getAllCourses ──────────────────────────────────────────────
// GET /courses  |  Public (students/guests see all; tutors only see their own)
const getAllCourses = async (req, res) => {
    try {
        // If an authenticated tutor is making the request, return only their courses
        const filter = (req.user && req.user.role?.toLowerCase() === 'tutor')
            ? { tutorId: req.user.id }
            : {};

        const courses = await Course.find(filter)
            .populate('tutorId', 'name email')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: 'Courses fetched successfully',
            total: courses.length,
            courses
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── getCourseById ─────────────────────────────────────────────
// GET /courses/:id  |  Public
const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('tutorId', 'name email');

        if (!course) return res.status(404).json({ message: 'Course not found' });

        return res.status(200).json({
            message: 'Course fetched successfully',
            course
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── updateCourse ──────────────────────────────────────────────
// PUT /courses/:id  |  Tutor only (owner)
const updateCourse = async (req, res) => {
    try {
        const { title, description, isPaid, price } = req.body;

        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Only the tutor who created it can update
        if (course.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to update this course' });
        }

        if (title !== undefined) course.title = title;
        if (description !== undefined) course.description = description;
        if (isPaid !== undefined) course.isPaid = isPaid;
        if (price !== undefined) course.price = price;
        await course.save();

        return res.status(200).json({
            message: 'Course updated successfully',
            course
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// ── deleteCourse ──────────────────────────────────────────────
// DELETE /courses/:id  |  Tutor only (owner)
const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to delete this course' });
        }

        await Course.findByIdAndDelete(req.params.id);

        // Cascade delete sessions, enrollments, progress
        await Session.deleteMany({ courseId: req.params.id });
        await Enrollment.deleteMany({ courseId: req.params.id });
        await Progress.deleteMany({ courseId: req.params.id });

        return res.status(200).json({ message: 'Course and all related data deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export default {
    createCourse,
    getAllCourses,
    getCourseById,
    updateCourse,
    deleteCourse
};