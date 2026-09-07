import mongoose from "mongoose";
import Enum from "../utils/enum.js";

const { TUTOR, STUDENT } = Enum.ROLES;

const StudentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    phone: { type: String, required: true, unique: true },
    isPhoneVerified: { type: Boolean, default: false },
    role: { type: String, enum: [TUTOR, STUDENT], default: STUDENT },
    rollNumber: { type: String, default: null },
    department: { type: String, default: null },
    collegeName: { type: String, default: null },
    collegeCode: { type: String, default: null },
    year: { type: String, default: null },
    placementStatus: { 
      type: String, 
      enum: ['Eligible', 'Interview In-Progress', 'Placed', 'Not Eligible'], 
      default: 'Eligible' 
    },
    // Password reset fields
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Student || mongoose.model("Student", StudentSchema);
