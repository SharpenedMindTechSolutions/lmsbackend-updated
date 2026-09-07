import Payment from '../models/PaymentModel.js';
import Course from '../models/CourseModel.js';
import Coupon from '../models/CouponModel.js';
import Enrollment from '../models/EnrollmentModel.js';
import Student from '../models/studentModel.js';

const paymentController = {
    // Student: Validate Coupon before payment
    validateCoupon: async (req, res) => {
        try {
            const { courseId, couponCode } = req.body;
            if (!couponCode) {
                return res.status(400).json({ message: 'Coupon code is required' });
            }

            const course = await Course.findById(courseId);
            if (!course) return res.status(404).json({ message: 'Course not found' });

            const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase(), isActive: true });
            if (!coupon) return res.status(400).json({ message: 'Invalid or inactive coupon code' });

            if (coupon.expiryDate && new Date() > coupon.expiryDate) {
                return res.status(400).json({ message: 'Coupon code has expired' });
            }

            if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
                return res.status(400).json({ message: 'Coupon usage limit reached' });
            }

            if (coupon.applicableCourses && coupon.applicableCourses.length > 0 && !coupon.applicableCourses.includes(courseId)) {
                return res.status(400).json({ message: 'Coupon is not applicable to this course' });
            }

            let discountAmount = (course.price * coupon.discountPercentage) / 100;
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                discountAmount = coupon.maxDiscount;
            }
            const finalAmount = Math.max(0, course.price - discountAmount);

            res.status(200).json({
                valid: true,
                code: coupon.code,
                discountPercentage: coupon.discountPercentage,
                discountAmount,
                finalAmount
            });
        } catch (error) {
            console.error('Validate Coupon Error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    // Student: Submit Direct UPI Payment Proof (UTR Number)
    submitUpiPayment: async (req, res) => {
        try {
            const { courseId, utr, couponCode } = req.body;
            const studentId = req.user.id;

            if (!courseId) {
                return res.status(400).json({ message: 'Course ID is required' });
            }

            if (!utr || typeof utr !== 'string') {
                return res.status(400).json({ message: '12-digit UTR / Reference number is required' });
            }

            const cleanUtr = utr.trim().toUpperCase();
            // Validate UTR format (must be 6 to 30 alphanumeric characters)
            if (cleanUtr.length < 6 || cleanUtr.length > 30) {
                return res.status(400).json({ message: 'Please enter a valid UPI Reference / UTR Number' });
            }

            const course = await Course.findById(courseId);
            if (!course) return res.status(404).json({ message: 'Course not found' });

            if (!course.isPaid || course.price <= 0) {
                return res.status(400).json({ message: 'This course is free. Please enroll using an enrollment code.' });
            }

            // ENFORCE VERIFICATION CODE FOR COMBO OFFERS
            if (course.isComboOffer) {
                const { enrollmentCode } = req.body;
                if (!enrollmentCode || course.enrollmentCode?.toUpperCase() !== enrollmentCode.trim().toUpperCase()) {
                    return res.status(403).json({ message: 'Invalid or missing Student Verification Code for this Combo Offer.' });
                }

                // Check roll number matching for COMBO-<CODE> format
                const codePrefixMatch = course.enrollmentCode.match(/^COMBO-(.+)$/i);
                if (codePrefixMatch) {
                    const student = await Student.findById(studentId);
                    const requiredRollCode = codePrefixMatch[1].trim().toUpperCase();
                    const studentRollUpper = student?.rollNumber ? student.rollNumber.trim().toUpperCase() : '';
                    const isMatch = studentRollUpper === requiredRollCode || studentRollUpper.startsWith(requiredRollCode);
                    if (!isMatch) {
                        return res.status(403).json({ message: 'Incorrect' });
                    }
                }
            }

            // Check if student is already actively enrolled
            const existingEnrollment = await Enrollment.findOne({ studentId, courseId, isVerified: true });
            if (existingEnrollment) {
                return res.status(400).json({ message: 'You are already enrolled in this course.' });
            }

            // Check if this student already has a pending payment for this course
            const pendingPayment = await Payment.findOne({ studentId, courseId, status: 'pending' });
            if (pendingPayment) {
                return res.status(400).json({ 
                    message: 'You already have a pending payment submitted for this course. Please wait for admin approval.',
                    payment: pendingPayment
                });
            }

            // Check for duplicate UTR across any student / course
            const duplicateUtr = await Payment.findOne({ 
                utr: cleanUtr, 
                status: { $in: ['pending', 'approved', 'paid'] } 
            });
            if (duplicateUtr) {
                return res.status(400).json({ message: 'This UTR / Reference number has already been submitted. Please check your transaction details.' });
            }

            // Calculate final amount with backend validation
            let finalAmount = course.price;
            let appliedCoupon = null;
            let discountAmount = 0;

            if (couponCode) {
                const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase(), isActive: true });
                if (coupon) {
                    const isApplicable = !coupon.applicableCourses || coupon.applicableCourses.length === 0 || coupon.applicableCourses.includes(courseId);
                    const notExpired = !coupon.expiryDate || new Date() <= coupon.expiryDate;
                    const withinLimit = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit;

                    if (isApplicable && notExpired && withinLimit) {
                        discountAmount = (course.price * coupon.discountPercentage) / 100;
                        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                            discountAmount = coupon.maxDiscount;
                        }
                        finalAmount = Math.max(0, course.price - discountAmount);
                        appliedCoupon = coupon;
                    }
                }
            }

            const payment = new Payment({
                studentId,
                courseId,
                amount: finalAmount,
                utr: cleanUtr,
                paymentId: cleanUtr,
                paymentMethod: 'UPI',
                status: 'pending',
                submittedAt: new Date(),
                metadata: {
                    originalPrice: course.price,
                    couponCode: appliedCoupon ? appliedCoupon.code : null,
                    discountAmount
                }
            });

            await payment.save();

            res.status(201).json({
                message: 'Payment submitted successfully. Waiting for admin verification.',
                payment
            });

        } catch (error) {
            console.error('Submit UPI Payment Error:', error);
            if (error.code === 11000) {
                return res.status(400).json({ message: 'This UTR / Transaction Reference number has already been used.' });
            }
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    // Student: Check status of payment for a course
    getPaymentStatus: async (req, res) => {
        try {
            const { courseId } = req.params;
            const studentId = req.user.id;

            const payment = await Payment.findOne({ studentId, courseId })
                .sort({ createdAt: -1 });

            res.status(200).json({ payment });
        } catch (error) {
            console.error('Get Payment Status Error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    // Student: Get my payment history
    getMyPayments: async (req, res) => {
        try {
            const payments = await Payment.find({ studentId: req.user.id })
                .populate('courseId', 'title price')
                .sort({ createdAt: -1 });
            res.status(200).json(payments);
        } catch (error) {
            console.error('Get My Payments Error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};

export default paymentController;
