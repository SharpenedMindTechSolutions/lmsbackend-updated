import { genSalt, hash, compare } from 'bcrypt';
import Student from '../models/studentModel.js';
import { jwtSecret } from '../config/config.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendWelcomeMail, { sendPasswordResetMail } from '../email/sendEmail.js';

// ── createStudent ─────────────────────────────────────────────
const createStudent = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const ifExists = await Student.findOne({ $or: [{ email }, { phone }] });
        if (ifExists) return res.status(400).json({ message: "Student already exists" });

        const salt = await genSalt(10);
        const hashedPassword = await hash(password, salt);
        const student = new Student({ name, email, password: hashedPassword, phone });
        await student.save();
        try {
            if (process.env.MAIL_USER && process.env.MAIL_PASS) {
                await sendWelcomeMail(student.email, student.name);
            }
        } catch (mailErr) {
            console.error("Welcome email failed to send:", mailErr.message);
        }
        return res.status(201).json({ message: "Student registered successfully.", student });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ── loginStudent ──────────────────────────────────────────────
const loginStudent = async (req, res) => {
    try {
        const { email, password } = req.body;
        const student = await Student.findOne({ email });
        if (!student) return res.status(404).json({ message: "Student not found" });

        const isMatch = await compare(password, student.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid password" });

        const token = jwt.sign({ id: student._id, role: student.role }, jwtSecret, { expiresIn: "24h" });
        return res.status(200).json({ student, token });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ── forgotPassword ────────────────────────────────────────────
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const student = await Student.findOne({ email });
        // Always return success to prevent email enumeration
        if (!student) return res.status(200).json({ message: "If that email exists, a reset link has been sent." });

        // Generate a secure random token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        student.resetPasswordToken = resetToken;
        student.resetPasswordExpires = tokenExpiry;
        await student.save();

        await sendPasswordResetMail(student.email, student.name, resetToken, 'student');
        return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ── resetPassword ─────────────────────────────────────────────
const resetPassword = async (req, res) => {
    try {
        const { token, email, newPassword } = req.body;
        if (!token || !email || !newPassword) return res.status(400).json({ message: "All fields required" });
        if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

        const student = await Student.findOne({
            email,
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() }  // token must not be expired
        });

        if (!student) return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });

        const salt = await genSalt(10);
        student.password = await hash(newPassword, salt);
        student.resetPasswordToken = null;
        student.resetPasswordExpires = null;
        await student.save();

        return res.status(200).json({ message: "Password reset successfully. You can now log in." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ── getAllStudents ─────────────────────────────────────────────
const getAllStudents = async (req, res) => {
    try {
        const students = await Student.find().select('-password').sort({ createdAt: -1 });
        return res.status(200).json({ message: "Students fetched successfully", students });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ── getStudentById ────────────────────────────────────────────
const getStudentById = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student.findById(id).select('-password');
        if (!student) return res.status(404).json({ message: "Student not found" });
        return res.status(200).json({ message: "Student fetched successfully", student });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ── updateStudent ─────────────────────────────────────────────
const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, phone } = req.body;
        const student = await Student.findById(id);
        if (!student) return res.status(404).json({ message: "Student not found" });

        if (student._id.toString() !== req.user.id && req.user.role !== 'TUTOR') {
            return res.status(403).json({ message: "Forbidden: You do not have permission to update this account" });
        }

        if (email && email !== student.email) {
            const emailExists = await Student.findOne({ email });
            if (emailExists) return res.status(400).json({ message: "Email already in use" });
        }
        if (phone && phone !== student.phone) {
            const phoneExists = await Student.findOne({ phone });
            if (phoneExists) return res.status(400).json({ message: "Phone already in use" });
        }

        const updateFields = {};
        if (name) updateFields.name = name;
        if (email) updateFields.email = email;
        if (phone) updateFields.phone = phone;
        if (password) {
            const salt = await genSalt(10);
            updateFields.password = await hash(password, salt);
        }

        const updatedStudent = await Student.findByIdAndUpdate(id, { $set: updateFields }, { returnDocument: 'after' });
        return res.status(200).json({ message: "Student updated successfully", student: updatedStudent });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ── deleteStudent ─────────────────────────────────────────────
const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student.findById(id);
        if (!student) return res.status(404).json({ message: "Student not found" });
        if (student._id.toString() !== req.user.id) {
            return res.status(403).json({ message: "Forbidden: You can only delete your own account" });
        }
        await Student.findByIdAndDelete(id);
        return res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ── logoutStudent ─────────────────────────────────────────────
const logoutStudent = async (req, res) => {
    return res.status(200).json({ message: "Logged out successfully" });
};

export default { createStudent, loginStudent, forgotPassword, resetPassword, getAllStudents, getStudentById, updateStudent, deleteStudent, logoutStudent };
