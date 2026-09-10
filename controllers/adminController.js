import Admin from '../models/AdminModel.js';
import Student from '../models/studentModel.js';
import Tutor from '../models/tutorModel.js';
import Course from '../models/CourseModel.js';
import Enrollment from '../models/EnrollmentModel.js';
import Payment from '../models/PaymentModel.js';
import Coupon from '../models/CouponModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/config.js';

const adminController = {
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            const admin = await Admin.findOne({ email });
            if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

            const token = jwt.sign({ id: admin._id, role: admin.role, name: admin.name }, jwtSecret, { expiresIn: '1d' });
            res.status(200).json({ token, user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
        } catch (error) {
            console.error('Admin Login Error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    getDashboardMetrics: async (req, res) => {
        try {
            const [
                totalStudents,
                totalTutors,
                totalCourses,
                totalEnrollments,
                successfulPayments,
                pendingPaymentsCount
            ] = await Promise.all([
                Student.countDocuments(),
                Tutor.countDocuments(),
                Course.countDocuments(),
                Enrollment.countDocuments(),
                Payment.find({ status: { $in: ['approved', 'paid'] } }),
                Payment.countDocuments({ status: 'pending' })
            ]);

            const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

            // Today's revenue
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const todaysPayments = successfulPayments.filter(p => new Date(p.createdAt) >= startOfToday);
            const todaysRevenue = todaysPayments.reduce((sum, p) => sum + p.amount, 0);

            res.status(200).json({
                totalStudents,
                totalTutors,
                totalCourses,
                totalEnrollments,
                totalRevenue,
                todaysRevenue,
                successfulPaymentsCount: successfulPayments.length,
                pendingPaymentsCount
            });
        } catch (error) {
            console.error('Dashboard Metrics Error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    getAllStudents: async (req, res) => {
        try {
            const students = await Student.find({}, '-password').sort({ createdAt: -1 });
            res.status(200).json(students);
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    getAllTutors: async (req, res) => {
        try {
            const tutors = await Tutor.find({}, '-password').sort({ createdAt: -1 });
            res.status(200).json(tutors);
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    getAllCourses: async (req, res) => {
        try {
            const courses = await Course.find().populate('tutorId', 'name email').sort({ createdAt: -1 });
            res.status(200).json(courses);
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    getAllPayments: async (req, res) => {
        try {
            const payments = await Payment.find()
                .populate('studentId', 'name email')
                .populate('courseId', 'title price isPaid')
                .populate('verifiedBy', 'name email')
                .sort({ createdAt: -1 });
            res.status(200).json(payments);
        } catch (error) {
            console.error('Get All Payments Error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    // Admin: Approve UPI Payment and Auto-Enroll Student
    approvePayment: async (req, res) => {
        try {
            const paymentId = req.params.id;
            const adminId = req.user.id;

            const payment = await Payment.findById(paymentId);
            if (!payment) return res.status(404).json({ message: 'Payment record not found' });

            if (payment.status === 'approved' || payment.status === 'paid') {
                return res.status(400).json({ message: 'Payment is already approved.' });
            }

            payment.status = 'approved';
            payment.verifiedAt = new Date();
            payment.verifiedBy = adminId;
            payment.rejectionReason = null;
            await payment.save();

            // Automatically create or activate enrollment for the student
            const student = await Student.findById(payment.studentId);
            const course = await Course.findById(payment.courseId);

            if (course && course.isComboOffer) {
                // Enroll in the combo course itself (to track purchase) and all bundled courses
                const coursesToEnroll = [...(course.bundledCourses || [])];
                if (!coursesToEnroll.includes(course._id)) {
                    coursesToEnroll.push(course._id);
                }

                for (const cid of coursesToEnroll) {
                    let enrollment = await Enrollment.findOne({ studentId: payment.studentId, courseId: cid });
                    if (!enrollment) {
                        enrollment = new Enrollment({
                            studentId: payment.studentId,
                            courseId: cid,
                            studentName: student?.name || 'Student',
                            isVerified: true,
                            verifiedAt: new Date()
                        });
                        await enrollment.save();
                    } else if (!enrollment.isVerified) {
                        // Activate if previously unverified
                        enrollment.isVerified = true;
                        enrollment.verifiedAt = new Date();
                        await enrollment.save();
                    }
                }
            } else {
                let enrollment = await Enrollment.findOne({ studentId: payment.studentId, courseId: payment.courseId });

                if (!enrollment) {
                    enrollment = new Enrollment({
                        studentId: payment.studentId,
                        courseId: payment.courseId,
                        studentName: student?.name || 'Student',
                        isVerified: true,
                        verifiedAt: new Date()
                    });
                    await enrollment.save();
                } else {
                    enrollment.isVerified = true;
                    enrollment.verifiedAt = new Date();
                    await enrollment.save();
                }
            }

            // If coupon was applied, increment usage count
            if (payment.metadata && payment.metadata.couponCode) {
                await Coupon.findOneAndUpdate(
                    { code: payment.metadata.couponCode },
                    { $inc: { usedCount: 1 } }
                );
            }

            const updatedPayment = await Payment.findById(paymentId)
                .populate('studentId', 'name email')
                .populate('courseId', 'title price')
                .populate('verifiedBy', 'name email');

            res.status(200).json({
                message: 'Payment approved successfully and student has been enrolled.',
                payment: updatedPayment
            });

        } catch (error) {
            console.error('Approve Payment Error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    // Admin: Reject UPI Payment
    rejectPayment: async (req, res) => {
        try {
            const paymentId = req.params.id;
            const adminId = req.user.id;
            const { reason } = req.body;

            const payment = await Payment.findById(paymentId);
            if (!payment) return res.status(404).json({ message: 'Payment record not found' });

            if (payment.status === 'approved' || payment.status === 'paid') {
                return res.status(400).json({ message: 'Cannot reject an already approved payment.' });
            }

            payment.status = 'rejected';
            payment.rejectionReason = reason?.trim() || 'Invalid transaction reference or payment not received.';
            payment.verifiedAt = new Date();
            payment.verifiedBy = adminId;
            await payment.save();

            const updatedPayment = await Payment.findById(paymentId)
                .populate('studentId', 'name email')
                .populate('courseId', 'title price')
                .populate('verifiedBy', 'name email');

            res.status(200).json({
                message: 'Payment rejected.',
                payment: updatedPayment
            });

        } catch (error) {
            console.error('Reject Payment Error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    // Coupons Management
    createCoupon: async (req, res) => {
        try {
            const newCoupon = new Coupon(req.body);
            await newCoupon.save();
            res.status(201).json({ message: 'Coupon created successfully', coupon: newCoupon });
        } catch (error) {
            if (error.code === 11000) return res.status(400).json({ message: 'Coupon code already exists' });
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    getAllCoupons: async (req, res) => {
        try {
            const coupons = await Coupon.find().populate('applicableCourses', 'title').sort({ createdAt: -1 });
            res.status(200).json(coupons);
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    toggleCouponStatus: async (req, res) => {
        try {
            const coupon = await Coupon.findById(req.params.id);
            if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
            coupon.isActive = !coupon.isActive;
            await coupon.save();
            res.status(200).json({ message: 'Coupon status updated', coupon });
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    // NOTE: Combo Offer create/update/delete moved to controllers/comboController.js
};

export default adminController;