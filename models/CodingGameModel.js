import mongoose from 'mongoose';

const codingGameSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    language: {
      type: String,
      enum: ['python', 'javascript', 'html', 'sql', 'reactjs', 'nodejs', 'expressjs', 'mongodb', 'java', 'machinelearning', 'powerbi', 'css', 'git', 'typescript'],
      required: true,
      index: true
    },
    gameType: {
      type: String,
      enum: ['fill-blank', 'bug-hunt', 'output-predict', 'code-reorder'],
      required: true,
      index: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy',
      index: true
    },
    starterCode: {
      type: String,
      default: ''
    },
    // For 'fill-blank'
    fillBlankData: {
      codeSnippet: { type: String, default: '' },
      blanks: [
        {
          id: { type: String },
          placeholder: { type: String },
          answer: { type: String },
          options: [{ type: String }]
        }
      ]
    },
    // For 'bug-hunt'
    bugHuntData: {
      buggyCode: { type: String, default: '' },
      hint: { type: String, default: '' },
      correctCode: { type: String, default: '' },
      correction: { type: String, default: '' } // expected key fix
    },
    // For 'output-predict'
    outputPredictData: {
      code: { type: String, default: '' },
      options: [{ type: String }],
      correctAnswer: { type: String, default: '' }
    },
    // For 'code-reorder'
    codeReorderData: {
      goal: { type: String, default: '' },
      lines: [
        {
          id: { type: String },
          code: { type: String },
          correctPosition: { type: Number }
        }
      ]
    },
    explanation: {
      type: String,
      required: true
    },
    xpReward: {
      type: Number,
      default: 25,
      min: 10
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.models.CodingGame || mongoose.model('CodingGame', codingGameSchema);
