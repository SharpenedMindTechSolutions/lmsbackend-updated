import axios from 'axios';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Admin from './models/AdminModel.js';

const API = 'http://localhost:5000/api';

async function runTests() {
    console.log("=== STARTING END-TO-END TESTS (NEW FLOW) ===");
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/LMS');
        const adminEmail = `admin_${Date.now()}@test.com`;
        const hashedPassword = await bcrypt.hash('password123', 10);
        await Admin.create({
            name: 'Test Admin',
            email: adminEmail,
            password: hashedPassword,
            role: 'admin'
        });

        // 1. Create a Student
        const studentEmail = `student_${Date.now()}@test.com`;
        await axios.post(`${API}/create/student`, {
            name: 'Test Student', email: studentEmail, phone: `888${Date.now().toString().slice(-7)}`, password: 'password123'
        });
        const studentLogin = await axios.post(`${API}/login/student`, { email: studentEmail, password: 'password123' });
        const studentToken = studentLogin.data.token;
        console.log("✅ Student created and logged in");

        // 2. Login Admin
        const adminLogin = await axios.post(`${API}/lms/admin/login`, { email: adminEmail, password: 'password123' });
        const adminToken = adminLogin.data.token;
        console.log("✅ Admin logged in");

        // 1. Create a Tutor
        const tutorEmail = `tutor_${Date.now()}@test.com`;
        await axios.post(`${API}/create/tutor`, {
            name: 'Test Tutor', email: tutorEmail, phone: `999${Date.now().toString().slice(-7)}`, password: 'password123'
        });
        const tutorLogin = await axios.post(`${API}/login/tutor`, { email: tutorEmail, password: 'password123' });
        const tutorToken = tutorLogin.data.token;
        console.log("✅ Tutor created and logged in");

        // 2. Create some individual courses (TUTOR role required)
        const c1Res = await axios.post(`${API}/lms/courses`, {
            title: 'React JS', description: 'React basics', price: 1000, tutorId: tutorLogin.data.tutor._id
        }, { headers: { Authorization: `Bearer ${tutorToken}` } });
        const c2Res = await axios.post(`${API}/lms/courses`, {
            title: 'Node JS', description: 'Node basics', price: 1000, tutorId: tutorLogin.data.tutor._id
        }, { headers: { Authorization: `Bearer ${tutorToken}` } });
        console.log("✅ 2 Individual courses created");

        // 3. Admin creates Combo Offer (ADMIN role required)
        const comboRes = await axios.post(`${API}/lms/admin/combo`, {
            title: 'Full Stack Masterclass',
            description: 'Learn MERN stack',
            price: 1500,
            tutorId: tutorLogin.data.tutor._id,
            bundledCourses: [c1Res.data.course._id, c2Res.data.course._id]
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        const combo = comboRes.data.combo;
        const enrollmentCode = combo.enrollmentCode;
        console.log(`✅ Combo created. Enrollment Code generated: ${enrollmentCode}`);

        // 5. Direct URL bypass check WITHOUT code
        try {
            await axios.post(`${API}/lms/payments/submit-upi`, {
                courseId: combo._id,
                utr: '123456789012'
            }, { headers: { Authorization: `Bearer ${studentToken}` } });
            throw new Error('Should have failed because no code was provided');
        } catch (e) {
            if (e.response && e.response.status === 403) {
                console.log("✅ Direct payment bypass successfully blocked (missing code)");
            } else throw e;
        }

        // 6. Direct URL bypass check WITH wrong code
        try {
            await axios.post(`${API}/lms/payments/submit-upi`, {
                courseId: combo._id,
                utr: '123456789012',
                enrollmentCode: 'WRONGCODE123'
            }, { headers: { Authorization: `Bearer ${studentToken}` } });
            throw new Error('Should have failed because wrong code was provided');
        } catch (e) {
            if (e.response && e.response.status === 403) {
                console.log("✅ Direct payment bypass successfully blocked (wrong code)");
            } else throw e;
        }

        // 7. Valid Code Verification Check (should NOT enroll)
        const verifyRes = await axios.post(`${API}/lms/enrollments/combo-verify`, {
            name: 'Test Student Updated', rollNumber: '101', department: 'CS', collegeName: 'Test College', year: '2',
            enrollmentCode: enrollmentCode
        }, { headers: { Authorization: `Bearer ${studentToken}` } });
        console.log("✅ Valid code verification succeeded");
        
        // Ensure NOT enrolled yet
        const checkResPre = await axios.get(`${API}/lms/enrollments/check/${combo._id}`, { headers: { Authorization: `Bearer ${studentToken}` } });
        if (checkResPre.data.verified) {
             throw new Error('Student was enrolled before payment!');
        }
        console.log("✅ Verified that enrollment is NOT created yet");

        // 8. Submit UPI Payment with correct code
        const utr = Date.now().toString().substring(0, 12);
        const payRes = await axios.post(`${API}/lms/payments/submit-upi`, {
            courseId: combo._id,
            utr: utr,
            enrollmentCode: enrollmentCode
        }, { headers: { Authorization: `Bearer ${studentToken}` } });
        const paymentId = payRes.data.payment._id;
        console.log(`✅ Payment successfully submitted! UTR: ${utr}`);

        // 9. Admin Approves Payment -> Creates enrollments
        await axios.put(`${API}/lms/admin/payments/${paymentId}/approve`, {}, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log(`✅ Admin approved payment`);

        // 10. Check if Enrollments exist for combo and bundled courses
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
        console.log("✅ Enrollment records correctly created for combo and bundled courses after payment");

        // 11. Duplicate Approval Test
        try {
            await axios.put(`${API}/lms/admin/payments/${paymentId}/approve`, {}, { headers: { Authorization: `Bearer ${adminToken}` } });
            throw new Error('Should have failed because payment is already approved');
        } catch (e) {
            if (e.response && e.response.status === 400) {
                console.log("✅ Duplicate payment approval handled without errors (no duplicate enrollments)");
            } else throw e;
        }

        console.log("=== ALL TESTS PASSED SUCCESSFULLY ===");
        process.exit(0);
    } catch (e) {
        console.error("❌ TEST FAILED:", e.response?.data || e.message);
        process.exit(1);
    }
}

runTests();
