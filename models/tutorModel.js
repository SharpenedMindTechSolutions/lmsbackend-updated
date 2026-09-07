import mongoose, { Schema, model } from 'mongoose';
import Enum from '../utils/enum.js';

const { TUTOR, STUDENT } = Enum.ROLES;

const TutorSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: String, enum: [TUTOR, STUDENT], default: TUTOR },
    // Password reset fields
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.Tutor || model('Tutor', TutorSchema);
