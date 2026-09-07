import Certificate, { getNextCertificateId } from '../models/CertificateModel.js';
import Progress from '../models/ProgressModel.js';
import Course from '../models/CourseModel.js';
import Student from '../models/studentModel.js';

// Internal function to check and generate a certificate
export const checkAndGenerateCertificate = async (studentId, courseId) => {
    try {
        // Ensure student has 100% completed the course
        const progress = await Progress.findOne({ studentId, courseId });
        if (!progress || progress.completionStatus !== 'completed') {
            return null; // Not completed
        }

        // Check if certificate already exists
        const existingCert = await Certificate.findOne({ studentId, courseId });
        if (existingCert) {
            return existingCert;
        }

        // Generate new certificate
        const course = await Course.findById(courseId);
        const student = await Student.findById(studentId);

        if (!course || !student) return null;

        const certificateId = await getNextCertificateId();

        const certificate = await Certificate.create({
            certificateId,
            studentId,
            courseId,
            studentName: student.name,
            courseName: course.title
        });

        return certificate;
    } catch (error) {
        console.error('Error generating certificate:', error);
        return null;
    }
};

// GET /api/lms/certificates/me
export const getMyCertificates = async (req, res) => {
    try {
        const certificates = await Certificate.find({ studentId: req.user.id })
            .select('-__v')
            .sort({ issuedAt: -1 });

        return res.status(200).json({ certificates });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// GET /api/lms/certificates/course/:courseId
export const getCourseCertificate = async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user.id;

        // Try to generate it just in case they reached 100% but it failed previously
        await checkAndGenerateCertificate(studentId, courseId);

        const certificate = await Certificate.findOne({ studentId, courseId });
        
        if (!certificate) {
            return res.status(404).json({ message: 'Certificate not available yet' });
        }

        return res.status(200).json({ certificate });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// GET /api/lms/certificates/verify/:certificateId (PUBLIC)
export const verifyCertificate = async (req, res) => {
    try {
        const { certificateId } = req.params;

        const certificate = await Certificate.findOne({ certificateId });

        if (!certificate) {
            return res.status(404).json({ message: 'Certificate not found', isValid: false });
        }

        if (certificate.verificationStatus === 'revoked') {
            return res.status(400).json({ 
                message: 'This certificate has been revoked', 
                isValid: false,
                certificate: {
                    certificateId: certificate.certificateId,
                    studentName: certificate.studentName,
                    courseName: certificate.courseName,
                    issuedAt: certificate.issuedAt
                }
            });
        }

        return res.status(200).json({
            message: 'Certificate is valid',
            isValid: true,
            certificate: {
                certificateId: certificate.certificateId,
                studentName: certificate.studentName,
                courseName: certificate.courseName,
                issuedAt: certificate.issuedAt,
                verificationStatus: certificate.verificationStatus
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export default {
    getMyCertificates,
    getCourseCertificate,
    verifyCertificate
};
