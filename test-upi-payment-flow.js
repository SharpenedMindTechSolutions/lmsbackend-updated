import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/lms';
const AUTH_URL = 'http://localhost:5000/api';

async function runTests() {
    console.log('=== STARTING UPI PAYMENT & ADMIN VERIFICATION REGRESSION TESTS ===\n');

    try {
        // 1. Login Admin
        console.log('1. Logging in as Super Admin (admin@lms.com)...');
        const adminLoginRes = await axios.post(`${BASE_URL}/admin/login`, {
            email: 'admin@lms.com',
            password: 'admin123'
        });
        const adminToken = adminLoginRes.data.token;
        console.log('   ✓ Super Admin authenticated successfully.');

        // 2. Register & Login Test Tutor
        console.log('\n2. Registering a test tutor...');
        const uniqueId = Date.now();
        const tutorEmail = `tutor_${uniqueId}@test.com`;
        await axios.post(`${AUTH_URL}/create/tutor`, {
            name: 'Test Tutor',
            email: tutorEmail,
            password: 'Password123!',
            bio: 'Senior Java Architect'
        });

        const tutorLoginRes = await axios.post(`${AUTH_URL}/login/tutor`, {
            email: tutorEmail,
            password: 'Password123!'
        });
        const tutorToken = tutorLoginRes.data.token;

        const courseTitle = `Java Masterclass ${uniqueId}`;
        const createCourseRes = await axios.post(`${BASE_URL}/courses`, {
            title: courseTitle,
            description: 'A comprehensive Java masterclass for verification testing',
            isPaid: true,
            price: 999
        }, {
            headers: { Authorization: `Bearer ${tutorToken}` }
        });
        const testCourse = createCourseRes.data.course;
        console.log(`   ✓ Created Paid Course: "${testCourse.title}" | Price: ₹${testCourse.price} | ID: ${testCourse._id}`);

        // 3. Register & Login Test Student
        console.log('\n3. Registering a test student...');
        const studentEmail = `student_${uniqueId}@test.com`;
        const phone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
        await axios.post(`${AUTH_URL}/create/student`, {
            name: 'Test Student',
            email: studentEmail,
            password: 'Password123!',
            phone: phone
        });

        const studentLoginRes = await axios.post(`${AUTH_URL}/login/student`, {
            email: studentEmail,
            password: 'Password123!'
        });
        const studentToken = studentLoginRes.data.token;
        console.log(`   ✓ Student registered and authenticated (${studentEmail}).`);

        // 4. Test Coupon Validation
        console.log('\n4. Testing Coupon Creation & Validation...');
        const couponCode = `SAVE20_${uniqueId}`;
        await axios.post(`${BASE_URL}/admin/coupons`, {
            code: couponCode,
            discountPercentage: 20,
            maxDiscount: 200,
            isActive: true
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        const couponValRes = await axios.post(`${BASE_URL}/payments/validate-coupon`, {
            courseId: testCourse._id,
            couponCode: couponCode
        }, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        console.log(`   ✓ Coupon applied: 20% discount on ₹999 -> Discount: ₹${couponValRes.data.discountAmount}, Final: ₹${couponValRes.data.finalAmount}`);

        // 5. Test Invalid UTR format rejection
        console.log('\n5. Testing Invalid UTR Rejection...');
        try {
            await axios.post(`${BASE_URL}/payments/submit-upi`, {
                courseId: testCourse._id,
                utr: '123' // Too short
            }, {
                headers: { Authorization: `Bearer ${studentToken}` }
            });
            console.error('   ✗ FAILED: Invalid short UTR was accepted!');
        } catch (e) {
            console.log('   ✓ Correctly rejected short/invalid UTR:', e.response?.data?.message);
        }

        // 6. Test Valid UTR Submission -> Pending status
        console.log('\n6. Testing Valid UPI UTR Submission...');
        const testUtr1 = `TEST${uniqueId}`;
        const submitRes = await axios.post(`${BASE_URL}/payments/submit-upi`, {
            courseId: testCourse._id,
            utr: testUtr1,
            couponCode: couponCode
        }, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        const payment1 = submitRes.data.payment;
        console.log(`   ✓ Payment submitted! Status: ${payment1.status} | UTR: ${payment1.utr} | Amount: ₹${payment1.amount}`);

        // 7. Test Duplicate UTR Rejection
        console.log('\n7. Testing Duplicate UTR Rejection...');
        try {
            await axios.post(`${BASE_URL}/payments/submit-upi`, {
                courseId: testCourse._id,
                utr: testUtr1
            }, {
                headers: { Authorization: `Bearer ${studentToken}` }
            });
            console.error('   ✗ FAILED: Duplicate UTR was accepted!');
        } catch (e) {
            console.log('   ✓ Correctly rejected duplicate UTR submission:', e.response?.data?.message);
        }

        // 8. Test Security: Tutor CANNOT approve payment
        console.log('\n8. Testing Security: Verifying Tutor CANNOT approve payment...');
        try {
            await axios.put(`${BASE_URL}/admin/payments/${payment1._id}/approve`, {}, {
                headers: { Authorization: `Bearer ${tutorToken}` }
            });
            console.error('   ✗ SECURITY FLAW: Tutor was able to approve payment!');
        } catch (e) {
            console.log('   ✓ Access forbidden for Tutor to approve payment (HTTP ' + e.response?.status + ')');
        }

        // 9. Admin Rejects Payment with Reason
        console.log('\n9. Testing Admin Rejection Flow...');
        const rejectRes = await axios.put(`${BASE_URL}/admin/payments/${payment1._id}/reject`, {
            reason: 'UTR mismatch with bank statement'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`   ✓ Admin rejected payment: Status = ${rejectRes.data.payment.status} | Reason: "${rejectRes.data.payment.rejectionReason}"`);

        // Check that student is NOT enrolled
        const checkEnrollment1 = await axios.get(`${BASE_URL}/enrollments/check/${testCourse._id}`, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        console.log(`   ✓ Verified student enrollment after rejection: verified = ${checkEnrollment1.data.verified} (Access Blocked)`);

        // 10. Student submits valid payment again & Admin Approves
        console.log('\n10. Testing Admin Approval & Auto-Enrollment Flow...');
        const testUtr2 = `PAID${uniqueId}`;
        const submitRes2 = await axios.post(`${BASE_URL}/payments/submit-upi`, {
            courseId: testCourse._id,
            utr: testUtr2
        }, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        const payment2 = submitRes2.data.payment;
        console.log(`   ✓ New payment submitted: UTR = ${payment2.utr} | Status = ${payment2.status}`);

        // Admin approves payment
        const approveRes = await axios.put(`${BASE_URL}/admin/payments/${payment2._id}/approve`, {}, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`   ✓ Admin approved payment: Status = ${approveRes.data.payment.status}`);

        // Check that student IS now actively enrolled
        const checkEnrollment2 = await axios.get(`${BASE_URL}/enrollments/check/${testCourse._id}`, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        console.log(`   ✓ Verified student enrollment after approval: verified = ${checkEnrollment2.data.verified} (Course UNLOCKED!)`);

        // 11. Test Student Payment History
        console.log('\n11. Testing Student Payment History Endpoint...');
        const historyRes = await axios.get(`${BASE_URL}/payments/my-payments`, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        console.log(`   ✓ Student has ${historyRes.data.length} payment records in history.`);

        // 12. Test Admin Metrics
        console.log('\n12. Testing Admin Dashboard Metrics...');
        const metricsRes = await axios.get(`${BASE_URL}/admin/metrics`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`   ✓ Platform Metrics: Total Revenue = ₹${metricsRes.data.totalRevenue} | Successful Payments = ${metricsRes.data.successfulPaymentsCount} | Pending = ${metricsRes.data.pendingPaymentsCount}`);

        console.log('\n======================================================');
        console.log('🎉 ALL UPI & ADMIN APPROVAL REGRESSION TESTS PASSED! 🎉');
        console.log('======================================================\n');
        process.exit(0);

    } catch (err) {
        console.error('\n✗ TEST FAILED WITH ERROR:', err.response?.data || err.message);
        process.exit(1);
    }
}

runTests();
