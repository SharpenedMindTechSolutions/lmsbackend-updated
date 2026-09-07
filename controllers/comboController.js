import crypto from 'crypto';
import Course from '../models/CourseModel.js';
import Student from '../models/studentModel.js';

// ── createComboOffer ────────────────────────────────────────────
// POST /admin/combo  |  Admin only
const createComboOffer = async (req, res) => {
    try {
        const { title, description, price, bundledCourses, tutorId, enrollmentCode: customCode } = req.body;

        if (!title || !description || !bundledCourses || !tutorId) {
            return res.status(400).json({ message: 'Title, description, tutorId, and bundledCourses are required' });
        }

        if (!Array.isArray(bundledCourses) || bundledCourses.length === 0) {
            return res.status(400).json({ message: 'Must select at least one course.' });
        }

        // Remove duplicates
        const uniqueBundled = [...new Set(bundledCourses)];

        // Verify courses exist
        const courses = await Course.find({ _id: { $in: uniqueBundled } });
        if (courses.length !== uniqueBundled.length) {
            return res.status(400).json({ message: 'One or more selected courses are invalid.' });
        }

        // Prevent nested combos
        if (courses.some(c => c.isComboOffer)) {
            return res.status(400).json({ message: 'Cannot bundle an existing combo offer inside a new combo.' });
        }

        let enrollmentCode = typeof customCode === 'string' ? customCode.trim() : '';

        if (enrollmentCode) {
            const escaped = enrollmentCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const existingCourse = await Course.findOne({ enrollmentCode: { $regex: new RegExp(`^${escaped}$`, 'i') } });
            if (existingCourse) {
                return res.status(400).json({ message: 'Enrollment code already exists.' });
            }
        } else {
            // Generate secure unique enrollment code
            enrollmentCode = `COMBO-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        }

        const combo = new Course({
            title: title.trim(),
            description: description.trim(),
            price: Number(price) || 0,
            isPaid: true,
            isComboOffer: true,
            bundledCourses: uniqueBundled,
            tutorId,
            enrollmentCode
        });

        await combo.save();
        res.status(201).json({ message: 'Combo Offer created successfully', combo });
    } catch (error) {
        console.error('Create Combo Error:', error);
        if (error.name === 'ValidationError') {
            const msg = Object.values(error.errors).map(val => val.message).join(', ');
            return res.status(400).json({ message: msg || 'Validation Error' });
        }
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

// ── updateComboOffer ────────────────────────────────────────────
// PUT /admin/combo/:id  |  Admin only
const updateComboOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, bundledCourses, tutorId, enrollmentCode: customCode } = req.body;

        const combo = await Course.findOne({ _id: id, isComboOffer: true });
        if (!combo) {
            return res.status(404).json({ message: 'Combo offer not found' });
        }

        if (title) combo.title = title.trim();
        if (description) combo.description = description.trim();
        if (price !== undefined) combo.price = Number(price) || 0;
        if (tutorId) combo.tutorId = tutorId;

        if (customCode !== undefined) {
            const trimmedCode = typeof customCode === 'string' ? customCode.trim() : '';
            if (trimmedCode) {
                const escaped = trimmedCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const existingCourse = await Course.findOne({
                    enrollmentCode: { $regex: new RegExp(`^${escaped}$`, 'i') },
                    _id: { $ne: id }
                });
                if (existingCourse) {
                    return res.status(400).json({ message: 'Enrollment code already exists.' });
                }
                combo.enrollmentCode = trimmedCode;
            }
        }

        if (bundledCourses) {
            if (!Array.isArray(bundledCourses) || bundledCourses.length === 0) {
                return res.status(400).json({ message: 'Must select at least one course.' });
            }
            const uniqueBundled = [...new Set(bundledCourses)];
            const courses = await Course.find({ _id: { $in: uniqueBundled } });
            if (courses.length !== uniqueBundled.length) {
                return res.status(400).json({ message: 'One or more selected courses are invalid.' });
            }
            if (courses.some(c => c.isComboOffer && c._id.toString() !== id)) {
                return res.status(400).json({ message: 'Cannot bundle an existing combo offer inside a combo.' });
            }
            combo.bundledCourses = uniqueBundled;
        }

        await combo.save();
        res.status(200).json({ message: 'Combo Offer updated successfully', combo });
    } catch (error) {
        console.error('Update Combo Error:', error);
        if (error.name === 'ValidationError') {
            const msg = Object.values(error.errors).map(val => val.message).join(', ');
            return res.status(400).json({ message: msg || 'Validation Error' });
        }
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

// ── deleteComboOffer ────────────────────────────────────────────
// DELETE /admin/combo/:id  |  Admin only
const deleteComboOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const combo = await Course.findOneAndDelete({ _id: id, isComboOffer: true });
        if (!combo) {
            return res.status(404).json({ message: 'Combo offer not found' });
        }
        res.status(200).json({ message: 'Combo Offer deleted successfully' });
    } catch (error) {
        console.error('Delete Combo Error:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

// ── verifyComboEnrollment ───────────────────────────────────────
// POST /enrollments/combo-verify  |  Student only
// Body: { name, rollNumber, department, collegeName, collegeCode, year, enrollmentCode }
const verifyComboEnrollment = async (req, res) => {
    try {
        const { name, rollNumber, department, collegeName, collegeCode, year, enrollmentCode } = req.body;
        const studentId = req.user.id;

        if (!name || !rollNumber || !department || !collegeName || !year || !enrollmentCode) {
            return res.status(400).json({ message: 'All fields including Enrollment Code are required.' });
        }

        const cleanEnrollmentCode = enrollmentCode.trim();
        const cleanRollNumber = rollNumber.trim();

        // Find Combo Offer by enrollment code (case insensitive)
        const escapedCode = cleanEnrollmentCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const comboOffer = await Course.findOne({
            enrollmentCode: { $regex: new RegExp(`^${escapedCode}$`, 'i') },
            isComboOffer: true
        });

        if (!comboOffer) {
            return res.status(400).json({ message: 'Invalid or inactive Enrollment Code.' });
        }

        // NOTE: Combo enrollment codes are randomly generated (e.g. COMBO-D97002) and
        // do not encode a roll-number prefix, so the code match above is the only
        // check needed to confirm this is a valid, admin-issued combo code.

        // Save/update the student's profile details captured on this form
        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ message: 'Student not found.' });

        student.name = name.trim();
        student.rollNumber = cleanRollNumber;
        student.department = department.trim();
        student.collegeName = collegeName.trim();
        if (collegeCode) student.collegeCode = collegeCode.trim();
        student.year = typeof year === 'string' ? year.trim() : year;
        await student.save();

        // Return Combo Offer details so the frontend can proceed to payment
        return res.status(200).json({
            success: true,
            message: 'Verification successful. Proceeding to Combo Offer.',
            comboOfferId: comboOffer._id,
            comboOffer: {
                title: comboOffer.title,
                description: comboOffer.description,
                price: comboOffer.price,
                bundledCoursesCount: comboOffer.bundledCourses?.length || 0,
                enrollmentCode: comboOffer.enrollmentCode
            }
        });

    } catch (error) {
        console.error('Combo Enrollment Verification Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export default {
    createComboOffer,
    updateComboOffer,
    deleteComboOffer,
    verifyComboEnrollment,
};