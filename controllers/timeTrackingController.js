import TimeTracking from '../models/TimeTrackingModel.js';
import Course from '../models/CourseModel.js';
import { formatDateString } from '../utils/streakEngine.js';

/**
 * POST /api/lms/analytics/heartbeat
 * Logs active seconds spent on the platform.
 * Body: { seconds, courseId, activityType }
 */
export const logHeartbeat = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { seconds = 30, courseId = null, activityType = 'browse' } = req.body;
    const today = formatDateString();

    // Sanitize seconds to prevent inflated time (min 1, max 120s per ping)
    const validSeconds = Math.min(120, Math.max(1, parseInt(seconds, 10) || 30));

    // Normalize courseId
    const targetCourseId = courseId && courseId !== 'null' && courseId !== 'undefined' ? courseId : null;

    let timeDoc = await TimeTracking.findOne({
      studentId,
      date: today,
      courseId: targetCourseId
    });

    if (!timeDoc) {
      timeDoc = new TimeTracking({
        studentId,
        date: today,
        courseId: targetCourseId,
        secondsSpent: 0,
        activities: []
      });
    }

    timeDoc.secondsSpent += validSeconds;

    // Update specific activity time
    const act = timeDoc.activities.find(a => a.activityType === activityType);
    if (act) {
      act.seconds += validSeconds;
    } else {
      timeDoc.activities.push({ activityType, seconds: validSeconds });
    }

    await timeDoc.save();

    // Calculate today's aggregate total across all courses
    const todayAll = await TimeTracking.find({ studentId, date: today });
    const todayTotalSeconds = todayAll.reduce((acc, d) => acc + (d.secondsSpent || 0), 0);

    return res.status(200).json({
      success: true,
      loggedSeconds: validSeconds,
      todayTotalSeconds
    });
  } catch (error) {
    console.error('logHeartbeat error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/lms/analytics/my-time
 * Returns student's active time summary: today, past 7 days, and all-time total.
 */
export const getMyTimeStats = async (req, res) => {
  try {
    const studentId = req.user.id;
    const today = formatDateString();

    // 1. Today's total
    const todayDocs = await TimeTracking.find({ studentId, date: today });
    const todaySeconds = todayDocs.reduce((acc, d) => acc + (d.secondsSpent || 0), 0);

    // 2. Past 7 days
    const past7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDateString(d);
      past7Days.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        seconds: 0
      });
    }

    const weeklyDocs = await TimeTracking.find({
      studentId,
      date: { $in: past7Days.map(p => p.date) }
    });

    weeklyDocs.forEach(doc => {
      const entry = past7Days.find(p => p.date === doc.date);
      if (entry) entry.seconds += (doc.secondsSpent || 0);
    });

    // 3. All-time total
    const allDocs = await TimeTracking.find({ studentId });
    const allTimeSeconds = allDocs.reduce((acc, d) => acc + (d.secondsSpent || 0), 0);

    return res.status(200).json({
      todaySeconds,
      weeklySummary: past7Days,
      allTimeSeconds,
      formattedToday: formatSeconds(todaySeconds),
      formattedAllTime: formatSeconds(allTimeSeconds)
    });
  } catch (error) {
    console.error('getMyTimeStats error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/lms/analytics/tutor/course-time/:courseId
 * Returns total time spent by all enrolled students on tutor's course.
 */
export const getTutorCourseStudentTime = async (req, res) => {
  try {
    const { courseId } = req.params;
    const tutorId = req.user.id;

    // Verify course ownership
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.tutorId.toString() !== tutorId) {
      return res.status(403).json({ message: 'Forbidden: You do not own this course' });
    }

    const timeLogs = await TimeTracking.find({ courseId }).populate('studentId', 'name email');

    // Aggregate by student
    const studentMap = {};
    for (const log of timeLogs) {
      if (!log.studentId) continue;
      const sId = log.studentId._id.toString();
      if (!studentMap[sId]) {
        studentMap[sId] = {
          studentId: sId,
          name: log.studentId.name,
          email: log.studentId.email,
          totalSeconds: 0
        };
      }
      studentMap[sId].totalSeconds += (log.secondsSpent || 0);
    }

    const studentTimes = Object.values(studentMap).map(s => ({
      ...s,
      formattedTime: formatSeconds(s.totalSeconds)
    }));

    return res.status(200).json({
      courseId,
      studentTimes
    });
  } catch (error) {
    console.error('getTutorCourseStudentTime error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const formatSeconds = (totalSec) => {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export default {
  logHeartbeat,
  getMyTimeStats,
  getTutorCourseStudentTime
};
