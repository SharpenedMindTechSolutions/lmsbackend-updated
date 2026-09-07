import mongoose, { Schema, model } from 'mongoose';
import Enum from '../utils/enum.js';

const { ADMIN } = Enum.ROLES;

const AdminSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: ADMIN },
}, { timestamps: true });

export default mongoose.models.Admin || model('Admin', AdminSchema);
