import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
mongoose.connect('mongodb://127.0.0.1:27017/LMS').then(async () => {
    const db = mongoose.connection.db;
    const newPassword = await bcrypt.hash('Sridharini@2024', 10);
    await db.collection('tutors').updateOne({ email: 'sridharini2103@gmail.com' }, { $set: { password: newPassword } });
    console.log('Tutor password reset to Sridharini@2024');
    process.exit(0);
});
