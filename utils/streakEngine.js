import Gamification from '../models/GamificationModel.js';

/**
 * Format Date to YYYY-MM-DD string
 */
export const formatDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get yesterday's date string (YYYY-MM-DD)
 */
export const getYesterdayDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateString(d);
};

/**
 * Centralized Engine to Record Student Activity, Award XP, and Update Daily Streaks.
 * 
 * @param {string|ObjectId} studentId 
 * @param {object} activity 
 * @param {string} activity.activityType - 'game' | 'video' | 'test' | 'assignment'
 * @param {string} activity.referenceId - unique identifier (sessionId, testId, challengeId_date, etc.)
 * @param {string} [activity.title] - friendly description of the completed item
 * @param {number} [activity.xpAmount] - XP to award (default based on activity)
 * @returns {Promise<object>} Result of streak and XP update
 */
export const recordActivity = async (studentId, { activityType, referenceId, title = '', xpAmount }) => {
  if (!studentId || !activityType || !referenceId) {
    throw new Error('studentId, activityType, and referenceId are required');
  }

  // Default XP amounts per activity
  const defaultXP = {
    game: 25,
    video: 20,
    test: 30,
    assignment: 40
  };

  const xpToAward = Number(xpAmount ?? defaultXP[activityType] ?? 10);
  const today = formatDateString();
  const yesterday = getYesterdayDateString();

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

  // 1. Check for duplicate activity to prevent duplicate XP
  const hasCompletedBefore = gamification.activityHistory.some(
    a => a.activityType === activityType && a.referenceId === String(referenceId)
  );

  if (hasCompletedBefore) {
    return {
      alreadyAwarded: true,
      xpEarned: 0,
      totalXP: gamification.totalXP,
      level: gamification.level,
      currentStreak: gamification.currentStreak,
      longestStreak: gamification.longestStreak,
      lastActivityDate: gamification.lastActivityDate
    };
  }

  // 2. Award XP and log activity
  gamification.totalXP += xpToAward;
  gamification.calculateLevel();

  gamification.activityHistory.push({
    date: today,
    activityType,
    referenceId: String(referenceId),
    title: title || `${activityType.toUpperCase()} Completed`,
    xpEarned: xpToAward,
    createdAt: new Date()
  });

  // 3. Compute Streak
  let isNewStreakDay = false;
  if (gamification.lastActivityDate === today) {
    // Already counted streak for today, preserve currentStreak
    isNewStreakDay = false;
  } else if (gamification.lastActivityDate === yesterday) {
    // Consecutive day action! Increment streak
    gamification.currentStreak += 1;
    gamification.longestStreak = Math.max(gamification.longestStreak, gamification.currentStreak);
    gamification.lastActivityDate = today;
    isNewStreakDay = true;
  } else {
    // Broken streak or first active day
    gamification.currentStreak = 1;
    gamification.longestStreak = Math.max(gamification.longestStreak, 1);
    gamification.lastActivityDate = today;
    isNewStreakDay = true;
  }

  await gamification.save();

  return {
    alreadyAwarded: false,
    xpEarned: xpToAward,
    totalXP: gamification.totalXP,
    level: gamification.level,
    currentStreak: gamification.currentStreak,
    longestStreak: gamification.longestStreak,
    lastActivityDate: gamification.lastActivityDate,
    isNewStreakDay
  };
};

export default {
  formatDateString,
  getYesterdayDateString,
  recordActivity
};
