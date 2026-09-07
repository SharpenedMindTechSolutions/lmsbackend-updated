import Gamification from '../models/GamificationModel.js';
import Student from '../models/studentModel.js';
import { formatDateString } from '../utils/streakEngine.js';

/**
 * GET /api/lms/gamification/my-stats
 * Returns current student's XP, level, streak, recent activity, and calendar heatmap.
 */
export const getMyGamificationStats = async (req, res) => {
  try {
    const studentId = req.user.id;
    const today = formatDateString();

    let gamification = await Gamification.findOne({ studentId });
    if (!gamification) {
      gamification = new Gamification({
        studentId,
        totalXP: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        activityHistory: []
      });
    }

    // Build calendar heatmap map: { "YYYY-MM-DD": { count: number, xp: number, items: [] } }
    const calendarHeatmap = {};
    for (const item of gamification.activityHistory) {
      if (!calendarHeatmap[item.date]) {
        calendarHeatmap[item.date] = { count: 0, xp: 0, items: [] };
      }
      calendarHeatmap[item.date].count += 1;
      calendarHeatmap[item.date].xp += item.xpEarned;
      calendarHeatmap[item.date].items.push({
        activityType: item.activityType,
        title: item.title,
        xp: item.xpEarned,
        time: item.createdAt
      });
    }

    const currentLevel = gamification.level || 1;
    const currentLevelProgressXP = gamification.totalXP % 100;
    const isTodayActive = gamification.lastActivityDate === today;

    return res.status(200).json({
      totalXP: gamification.totalXP,
      level: currentLevel,
      levelProgressXP: currentLevelProgressXP,
      nextLevelRequiredXP: 100,
      currentStreak: gamification.currentStreak,
      longestStreak: gamification.longestStreak,
      lastActivityDate: gamification.lastActivityDate,
      isTodayActive,
      recentActivity: gamification.activityHistory.slice(-10).reverse(),
      calendarHeatmap
    });
  } catch (error) {
    console.error('getMyGamificationStats error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/lms/gamification/leaderboard
 * Returns top 10 students ranked by XP.
 */
export const getLeaderboard = async (req, res) => {
  try {
    const topGamers = await Gamification.find()
      .sort({ totalXP: -1, currentStreak: -1 })
      .limit(10)
      .populate('studentId', 'name email');

    const leaderboard = topGamers
      .filter(g => g.studentId)
      .map((g, idx) => ({
        rank: idx + 1,
        studentId: g.studentId._id,
        name: g.studentId.name,
        totalXP: g.totalXP,
        level: g.level,
        currentStreak: g.currentStreak
      }));

    return res.status(200).json({ leaderboard });
  } catch (error) {
    console.error('getLeaderboard error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export default {
  getMyGamificationStats,
  getLeaderboard
};
