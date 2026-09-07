import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS   // Use Gmail App Password
    }
});

// ── sendWelcomeMail ────────────────────────────────────────────────────────────
const sendWelcomeMail = async (toEmail, studentName) => {
    const mailOptions = {
        from: `"SharpenedMind" <${process.env.MAIL_USER}>`,
        to: toEmail,
        subject: '🎉 Welcome to SharpenedMind!',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #f4f7fb; padding: 40px 20px;">
            <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #4F46E5, #2563EB); color: white; padding: 35px; text-align: center;">
                    <h1 style="margin:0; font-size: 30px;">Welcome 🎓</h1>
                    <p style="margin-top:10px; font-size:15px; opacity:0.9;">Registration Successful</p>
                </div>
                <div style="padding: 35px; color:#333;">
                    <h2 style="color:#4F46E5; margin-top:0;">Hello, ${studentName} 👋</h2>
                    <p style="font-size:15px; line-height:1.8; color:#555;">You have successfully registered to <strong>SharpenedMind</strong>.</p>
                    <p style="margin-top:25px; color:#555;">Regards,<br/><strong>SharpenedMind Team</strong></p>
                </div>
                <div style="background:#f9fafb; text-align:center; padding:18px; font-size:12px; color:#888;">© 2026 SharpenedMind | All Rights Reserved</div>
            </div>
        </div>`
    };
    await transporter.sendMail(mailOptions);
};

// ── sendPasswordResetMail ──────────────────────────────────────────────────────
const sendPasswordResetMail = async (toEmail, userName, resetToken, role = 'student') => {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetPath = role === 'tutor' ? '/tutor/reset-password' : '/reset-password';
    const resetLink = `${baseUrl}${resetPath}?token=${resetToken}&email=${encodeURIComponent(toEmail)}`;

    const mailOptions = {
        from: `"SharpenedMind Security" <${process.env.MAIL_USER}>`,
        to: toEmail,
        subject: '🔐 Reset Your SharpenedMind Password',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #f4f7fb; padding: 40px 20px;">
            <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #7c3aed, #4c1d95); color: white; padding: 35px; text-align: center;">
                    <h1 style="margin:0; font-size: 28px;">🔐 Password Reset</h1>
                    <p style="margin-top:10px; font-size:15px; opacity:0.9;">We received a reset request for your account</p>
                </div>
                <div style="padding: 35px; color:#333;">
                    <h2 style="color:#4c1d95; margin-top:0;">Hello, ${userName} 👋</h2>
                    <p style="font-size:15px; line-height:1.8; color:#555;">
                        We received a request to reset your password. Click the button below to set a new password.
                        This link is valid for <strong>15 minutes</strong>.
                    </p>
                    <div style="text-align:center; margin: 30px 0;">
                        <a href="${resetLink}" 
                           style="background: linear-gradient(135deg, #7c3aed, #4c1d95); color: white; padding: 14px 32px;
                                  border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display:inline-block;">
                            Reset My Password
                        </a>
                    </div>
                    <div style="background:#fef3f2; padding:16px; border-left:4px solid #ef4444; border-radius:8px; margin:20px 0;">
                        <p style="margin:0; color:#991b1b; font-size:13px;">
                            ⚠️ If you did not request this reset, please ignore this email. Your password will not change.
                        </p>
                    </div>
                    <p style="font-size:13px; color:#888;">
                        Or copy this link: <a href="${resetLink}" style="color:#7c3aed; word-break:break-all;">${resetLink}</a>
                    </p>
                    <p style="margin-top:30px; color:#555;">Regards,<br/><strong>SharpenedMind Team</strong></p>
                </div>
                <div style="background:#f9fafb; text-align:center; padding:18px; font-size:12px; color:#888;">© 2026 SharpenedMind | All Rights Reserved</div>
            </div>
        </div>`
    };
    await transporter.sendMail(mailOptions);
};

// ── sendAssignmentSubmissionNotification ───────────────────────────────────────
const sendAssignmentSubmissionNotification = async ({
    tutorEmail, tutorName, studentName, courseTitle, assignmentTitle, fileName, fileType, submittedAt
}) => {
    const formattedDate = new Date(submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const mailOptions = {
        from: `"SharpenedMind" <${process.env.MAIL_USER}>`,
        to: tutorEmail,
        subject: `📝 New Assignment Submission – ${assignmentTitle}`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #f4f7fb; padding: 40px 20px;">
            <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #059669, #10B981); color: white; padding: 35px; text-align: center;">
                    <h1 style="margin:0; font-size: 26px;">📋 Assignment Submitted</h1>
                </div>
                <div style="padding: 35px; color:#333;">
                    <h2 style="color:#059669; margin-top:0;">Hello, ${tutorName} 👋</h2>
                    <div style="background:#ECFDF5; padding:20px; border-left:5px solid #10B981; border-radius:8px; margin:25px 0;">
                        <p style="margin:0 0 8px 0;">📚 <strong>Course:</strong> ${courseTitle}</p>
                        <p style="margin:0 0 8px 0;">📝 <strong>Assignment:</strong> ${assignmentTitle}</p>
                        <p style="margin:0 0 8px 0;">👤 <strong>Student:</strong> ${studentName}</p>
                        <p style="margin:0 0 8px 0;">📁 <strong>File:</strong> ${fileName} (${fileType.toUpperCase()})</p>
                        <p style="margin:0;">🕐 <strong>Submitted At:</strong> ${formattedDate}</p>
                    </div>
                    <p style="margin-top:30px; color:#555;">Regards,<br/><strong>SharpenedMind Team</strong></p>
                </div>
                <div style="background:#f9fafb; text-align:center; padding:18px; font-size:12px; color:#888;">© 2026 SharpenedMind | All Rights Reserved</div>
            </div>
        </div>`
    };
    await transporter.sendMail(mailOptions);
};

export { sendWelcomeMail as default, sendPasswordResetMail, sendAssignmentSubmissionNotification };
