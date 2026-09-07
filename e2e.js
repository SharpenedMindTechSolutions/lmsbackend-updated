import axios from 'axios';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Admin from './models/AdminModel.js';

const API = 'http://localhost:5000/api';

async function runTests() {
    console.log("=== STARTING END-TO-END TESTS ===");
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/LMS');
        const adminEmail = `admin_${Date.now()}@test.com`;
        const hash = await bcrypt.hash('password123', 10);
        await Admin.create({ name: 'Admin', email: adminEmail, password: hash, role: 'admin' });

        const adminLogin = await axios.post(`${API}/lms/admin/login`, { email: adminEmail, password: 'password123' });
        const adminToken = adminLogin.data.token;
        console.log("✅ Admin created and logged in");

        // 1. Create a Tutor
        const tutorEmail = `tutor_${Date.now()}@test.com`;
        await axios.post(`${API}/create/tutor`, {
            name: 'Test Tutor', email: tutorEmail, phone: `999${Date.now().toString().slice(-7)}`, password: 'password123'
        });
        const tutorLogin = await axios.post(`${API}/login/tutor`, { email: tutorEmail, password: 'password123' });
        const tutorToken = tutorLogin.data.token;
        console.log("✅ Tutor created and logged in");

        // 2. Create some individual courses
        const c1Res = await axios.post(`${API}/lms/courses`, {
            title: 'React JS', description: 'React basics', price: 1000
        }, { headers: { Authorization: `Bearer ${tutorToken}` } });
        const c2Res = await axios.post(`${API}/lms/courses`, {
            title: 'Node JS', description: 'Node basics', price: 1000
        }, { headers: { Authorization: `Bearer ${tutorToken}` } });
        console.log("✅ 2 Individual courses created");

        const comboRes = await axios.post(`${API}/lms/admin/combo`, {
            title: 'Full Stack Masterclass',
            description: 'Learn MERN stack',
            price: 1500,
            tutorId: tutorLogin.data.tutor ? tutorLogin.data.tutor._id : tutorLogin.data.user?.id,
            bundledCourses: [c1Res.data.course._id, c2Res.data.course._id]
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        const combo = comboRes.data.combo;
        const enrollmentCode = combo.enrollmentCode;
        console.log(`✅ Combo created. Enrollment Code generated: ${enrollmentCode}`);

        if (!enrollmentCode || !enrollmentCode.startsWith('COMBO-')) {
            throw new Error('Enrollment code not generated properly');
        }

        // 4. Create a Student
        const studentEmail = `student_${Date.now()}@test.com`;
        await axios.post(`${API}/create/student`, {
            name: 'Test Student', email: studentEmail, phone: `888${Date.now().toString().slice(-7)}`, password: 'password123'
        });
        const studentLogin = await axios.post(`${API}/login/student`, { email: studentEmail, password: 'password123' });
        const studentToken = studentLogin.data.token;
        console.log("✅ Student created and logged in");

        // 5. Invalid Code Test
        try {
            await axios.post(`${API}/lms/enrollments/combo-verify`, {
                name: 'Test Student', rollNumber: '101', department: 'CS', collegeName: 'Test College', year: '2',
                enrollmentCode: 'INVALID-CODE'
            }, { headers: { Authorization: `Bearer ${studentToken}` } });
            throw new Error('Should have failed for invalid code');
        } catch (e) {
            if (e.response && e.response.status === 400) {
                console.log("✅ Invalid code test passed (access denied)");
            } else throw e;
        }

        // 6. Valid Combo Enrollment Test
        const enrollRes = await axios.post(`${API}/lms/enrollments/combo-verify`, {
            name: 'Test Student Updated', rollNumber: '101', department: 'CS', collegeName: 'Test College', year: '2',
            enrollmentCode: enrollmentCode
        }, { headers: { Authorization: `Bearer ${studentToken}` } });
        console.log("✅ Valid code enrollment succeeded");

        // 7. Verify Enrollments exist for combo and bundled courses
        const myCoursesRes = await axios.get(`${API}/lms/courses`, { headers: { Authorization: `Bearer ${studentToken}` } });
        let enrolledCount = 0;
        for (const c of myCoursesRes.data.courses) {
            try {
                const ec = await axios.get(`${API}/lms/enrollments/check/${c._id}`, { headers: { Authorization: `Bearer ${studentToken}` } });
                if (ec.data.verified) enrolledCount++;
            } catch (e) {}
        }
        // Should be enrolled in Combo, React JS, Node JS -> 3 enrollments
        if (enrolledCount !== 3) {
            throw new Error(`Expected 3 enrollments, found ${enrolledCount}`);
        }
        console.log("✅ Enrollment records correctly created for combo and bundled courses");

        // 8. Duplicate Test
        const enrollRes2 = await axios.post(`${API}/lms/enrollments/combo-verify`, {
            name: 'Test Student Updated', rollNumber: '101', department: 'CS', collegeName: 'Test College', year: '2',
            enrollmentCode: enrollmentCode
        }, { headers: { Authorization: `Bearer ${studentToken}` } });
        console.log("✅ Duplicate enrollment attempt handled without errors");

        console.log("=== ALL TESTS PASSED SUCCESSFULLY ===");
    } catch (e) {
        console.error("❌ TEST FAILED:", e.response?.data || e.message);
    }
}

runTests();
