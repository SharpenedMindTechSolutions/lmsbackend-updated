import bcrypt from 'bcryptjs';
const { genSalt, hash, compare } = bcrypt;
import Tutor from '../models/tutorModel.js';
import { jwtSecret } from '../config/config.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendPasswordResetMail } from '../email/sendEmail.js';

// ── createTutor ───────────────────────────────────────────────
const createTutor = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const ifExists = await Tutor.findOne({ email });
        if (ifExists) return res.status(400).json({ message: "Tutor already exists" });

        const salt = await genSalt(10);
        const hashedPassword = await hash(password, salt);
        const tutor = new Tutor({ name, email, password: hashedPassword });
        await tutor.save();
        return res.status(201).json({ message: "Tutor registered successfully.", tutor });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ── loginTutor ────────────────────────────────────────────────
const loginTutor = async (req, res) => {
    try {
        const { email, password } = req.body;
        const tutor = await Tutor.findOne({ email });
        if (!tutor) return res.status(404).json({ message: "Tutor not found" });

        const isMatch = await compare(password, tutor.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid password" });

        const token = jwt.sign({ id: tutor._id, role: tutor.role }, jwtSecret, { expiresIn: "24h" });
        return res.status(200).json({ tutor, token });
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

        const tutor = await Tutor.findOne({ email });
        if (!tutor) return res.status(200).json({ message: "If that email exists, a reset link has been sent." });

        const resetToken = crypto.randomBytes(32).toString('hex');
        tutor.resetPasswordToken = resetToken;
        tutor.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
        await tutor.save();

        await sendPasswordResetMail(tutor.email, tutor.name, resetToken, 'tutor');
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

        const tutor = await Tutor.findOne({
            email,
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!tutor) return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });

        const salt = await genSalt(10);
        tutor.password = await hash(newPassword, salt);
        tutor.resetPasswordToken = null;
        tutor.resetPasswordExpires = null;
        await tutor.save();
        return res.status(200).json({ message: "Password reset successfully. You can now log in." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ── getAllTutors ──────────────────────────────────────────────
const getAllTutors = async (req, res) => {
    try {
        const tutors = await Tutor.find();
        return res.status(200).json({ message: "Tutors fetched", tutors });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ── getTutorById ──────────────────────────────────────────────
const getTutorById = async (req, res) => {
    try {
        const tutor = await Tutor.findById(req.params.id);
        if (!tutor) return res.status(404).json({ message: "Tutor not found" });
        return res.status(200).json({ tutor });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ── updateTutor ───────────────────────────────────────────────
const updateTutor = async (req, res) => {
    try {
        const { id } = req.params;
        const tutor = await Tutor.findById(id);
        if (!tutor) return res.status(404).json({ message: "Tutor not found" });
        if (tutor._id.toString() !== req.user.id) return res.status(403).json({ message: "Forbidden" });

        const { name, email, password } = req.body;
        const updateFields = {};
        if (name) updateFields.name = name;
        if (email) updateFields.email = email;
        if (password) {
            const salt = await genSalt(10);
            updateFields.password = await hash(password, salt);
        }
        const updated = await Tutor.findByIdAndUpdate(id, { $set: updateFields }, { returnDocument: 'after' });
        return res.status(200).json({ message: "Tutor updated", tutor: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ── deleteTutor ───────────────────────────────────────────────
const deleteTutor = async (req, res) => {
    try {
        const { id } = req.params;
        const tutor = await Tutor.findById(id);
        if (!tutor) return res.status(404).json({ message: "Tutor not found" });
        if (tutor._id.toString() !== req.user.id) return res.status(403).json({ message: "Forbidden" });
        await Tutor.findByIdAndDelete(id);
        return res.status(200).json({ message: "Tutor deleted" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export default { createTutor, loginTutor, forgotPassword, resetPassword, getAllTutors, getTutorById, updateTutor, deleteTutor };
