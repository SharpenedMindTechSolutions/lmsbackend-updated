import CodingGame from '../models/CodingGameModel.js';
import GameSubmission from '../models/GameSubmissionModel.js';
import { formatDateString, recordActivity } from '../utils/streakEngine.js';

/**
 * GET /api/lms/games/daily
 * Deterministically returns the daily challenge for today.
 */
export const getDailyChallenge = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const today = formatDateString();

    const allGames = await CodingGame.find({ isActive: true });
    if (!allGames || allGames.length === 0) {
      return res.status(404).json({ message: 'No coding games available' });
    }

    // Deterministic index selection based on date string hash
    const dateNum = today.split('-').reduce((acc, part) => acc + parseInt(part, 10), 0);
    const selectedIndex = dateNum % allGames.length;
    const dailyChallenge = allGames[selectedIndex];

    // Check if student completed today
    let completedToday = false;
    let submission = null;
    if (studentId) {
      submission = await GameSubmission.findOne({
        studentId,
        gameId: dailyChallenge._id,
        date: today,
        isCorrect: true
      });
      if (submission) completedToday = true;
    }

    return res.status(200).json({
      challenge: dailyChallenge,
      date: today,
      completedToday,
      submission
    });
  } catch (error) {
    console.error('getDailyChallenge error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/lms/games/all
 * Returns all coding games with optional filters (language, gameType, difficulty).
 */
export const getAllChallenges = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const { language, gameType, difficulty } = req.query;

    const filter = { isActive: true };
    if (language) filter.language = language.toLowerCase();
    if (gameType) filter.gameType = gameType.toLowerCase();
    if (difficulty) filter.difficulty = difficulty.toLowerCase();

    const challenges = await CodingGame.find(filter).sort({ createdAt: -1 });

    // Fetch user's completed submissions
    let completedGameIds = new Set();
    if (studentId) {
      const submissions = await GameSubmission.find({
        studentId,
        isCorrect: true
      }).select('gameId');
      completedGameIds = new Set(submissions.map(s => s.gameId.toString()));
    }

    const formatted = challenges.map(ch => ({
      ...ch.toObject(),
      isCompleted: completedGameIds.has(ch._id.toString())
    }));

    return res.status(200).json({
      total: formatted.length,
      challenges: formatted
    });
  } catch (error) {
    console.error('getAllChallenges error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/lms/games/submit
 * Validates the student's solution, records submission, awards XP & updates streak.
 */
export const submitGameSolution = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { gameId, answer, isDaily } = req.body;
    const today = formatDateString();

    if (!gameId || answer === undefined) {
      return res.status(400).json({ message: 'gameId and answer are required' });
    }

    const game = await CodingGame.findById(gameId);
    if (!game) return res.status(404).json({ message: 'Challenge not found' });

    let isCorrect = false;
    let feedback = '';

    // Validate based on gameType
    if (game.gameType === 'fill-blank') {
      // answer is an object: { b1: 'val', b2: 'val' } or single string
      const blanks = game.fillBlankData?.blanks || [];
      if (typeof answer === 'object') {
        isCorrect = blanks.every(b => {
          const userAns = String(answer[b.id] || '').trim().toLowerCase();
          const target = String(b.answer || '').trim().toLowerCase();
          return userAns === target;
        });
      } else {
        const target = String(blanks[0]?.answer || '').trim().toLowerCase();
        isCorrect = String(answer).trim().toLowerCase() === target;
      }
    } else if (game.gameType === 'bug-hunt') {
      // answer is the corrected snippet/keyword
      const expectedFix = String(game.bugHuntData?.correction || '').trim().toLowerCase();
      const userFix = String(answer || '').trim().toLowerCase();
      isCorrect = userFix.includes(expectedFix) || expectedFix.includes(userFix);
    } else if (game.gameType === 'output-predict') {
      const target = String(game.outputPredictData?.correctAnswer || '').trim().toLowerCase();
      isCorrect = String(answer).trim().toLowerCase() === target;
    } else if (game.gameType === 'code-reorder') {
      // answer is array of line ids in user order: ['1', '2', '3']
      const correctLines = [...(game.codeReorderData?.lines || [])].sort((a, b) => a.correctPosition - b.correctPosition);
      if (Array.isArray(answer) && answer.length === correctLines.length) {
        isCorrect = answer.every((id, idx) => id === correctLines[idx].id);
      }
    }

    if (!isCorrect) {
      return res.status(200).json({
        isCorrect: false,
        message: 'Incorrect solution. Check hints and try again!',
        hint: game.bugHuntData?.hint || null
      });
    }

    // Solution is correct! Check duplicate submission
    const existing = await GameSubmission.findOne({
      studentId,
      gameId: game._id,
      date: today,
      isCorrect: true
    });

    let streakResult = { alreadyAwarded: true, xpEarned: 0 };
    if (!existing) {
      await GameSubmission.create({
        studentId,
        gameId: game._id,
        date: today,
        isDaily: Boolean(isDaily),
        isCorrect: true,
        submittedAnswer: answer,
        xpEarned: game.xpReward
      });

      // Record activity in centralized streak engine
      streakResult = await recordActivity(studentId, {
        activityType: 'game',
        referenceId: isDaily ? `daily_${game._id}_${today}` : `game_${game._id}`,
        title: game.title,
        xpAmount: game.xpReward
      });
    }

    return res.status(200).json({
      isCorrect: true,
      message: '🎉 Fantastic! Challenge Solved Successfully!',
      explanation: game.explanation,
      xpEarned: streakResult.xpEarned,
      totalXP: streakResult.totalXP,
      level: streakResult.level,
      currentStreak: streakResult.currentStreak,
      longestStreak: streakResult.longestStreak,
      isNewStreakDay: streakResult.isNewStreakDay || false,
      alreadyCompleted: existing ? true : false
    });
  } catch (error) {
    console.error('submitGameSolution error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export default {
  getDailyChallenge,
  getAllChallenges,
  submitGameSolution
};
