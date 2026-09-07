
import dns from 'node:dns';

dns.setServers([
  '8.8.8.8',
  '1.1.1.1'
]);


import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import Admin from './models/AdminModel.js';

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const adminEmail = 'admin@lms.com';
        
        const existingAdmin = await Admin.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Super Admin already exists.');
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash('admin123', 10);
        const admin = new Admin({
            name: 'Super Admin',
            email: adminEmail,
            password: hashedPassword,
            role: 'ADMIN' // must match Enum.ROLES.ADMIN
        });

        await admin.save();
        console.log('Super Admin seeded successfully! Email: admin@lms.com | Password: admin123');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
