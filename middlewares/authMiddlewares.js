import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/config.js";
import Course from "../models/CourseModel.js";


function authorize(req, res, next) {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ message: "authentication is required" });

    const token = authHeader.startsWith('Bearer ') 
        ? authHeader.split(' ')[1] 
        : authHeader;


    if (!token) return res.status(401).json({ message: "Invalid token format" });

    try {
        const decoded = jwt.verify(token, jwtSecret, { clockTolerance: 60 });
        req.user = decoded;
        next();
    } catch (error) {
        console.log("jwt error:", error.message);
        return res.status(401).json({ message: "Error in Authentication" });
    }
}

function authenticateRole(allocatedRoles) {
    return (req, res, next) => {
        // normalize both sides to lowercase before comparing
        const userRole = req.user.role?.toLowerCase();
        const roles = allocatedRoles.map(r => r.toLowerCase());

        if (!roles.includes(userRole)) {
            return res.status(403).json({ message: 'Forbidden: Access is denied' });
        }
        next();
    };
}

// Middleware: verifies the authenticated tutor owns the course (by :courseId param)
async function verifyCourseOwnership(req, res, next) {
    try {
        const courseId = req.params.courseId || req.params.id;
        if (!courseId) return res.status(400).json({ message: 'Course ID is required' });

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden: You do not own this course' });
        }

        req.course = course; // attach for downstream use
        next();
    } catch (error) {
        console.error('verifyCourseOwnership error:', error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Optional authorize middleware — attaches req.user if a valid token is present, but never blocks
function authorizeOptional(req, res, next) {
    const authHeader = req.header('Authorization');
    if (!authHeader) return next(); // no token → proceed as guest
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    if (!token) return next();
    try {
        const decoded = jwt.verify(token, jwtSecret, { clockTolerance: 60 });
        req.user = decoded;
    } catch (_) { /* invalid token → treat as guest */ }
    next();
}

export default { authorize, authorizeOptional, authenticateRole, verifyCourseOwnership };