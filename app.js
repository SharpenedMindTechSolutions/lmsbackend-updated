import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dns from 'node:dns';

import tutorRoutes from './routers/tutorRouter.js';
import studentRoutes from './routers/studentRouter.js';
import lmsRoutes from './routers/Lmsroutes.js';
import discussionRoutes from './routes/discussionRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

import { seedGamesIfEmpty } from './utils/seedCodingGames.js';

dns.setServers([
  '8.8.8.8',
  '1.1.1.1'
]);

const app = express();

// ----------------------
// MIDDLEWARE
// ----------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://lmsfrontend-updated.vercel.app',
    'https://lms.sharpenedmindtechnologies.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ----------------------
// DATABASE (serverless-safe connection caching)
// ----------------------

let isConnected = false;
let hasSeeded = false;

async function connectDB() {
  // If Mongoose already reports "connected" state (1), reuse it — don't reconnect.
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  await mongoose.connect(process.env.MONGO_URI, {
    bufferCommands: false, // fail fast instead of silently buffering for 10s
  });

  isConnected = true;
  console.log('MongoDB connected ✅');

  if (!hasSeeded) {
    await seedGamesIfEmpty();
    hasSeeded = true;
  }
}

// Ensure every incoming request has a live DB connection before hitting routes
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('MongoDB connection failed ❌', error);
    res.status(503).json({ message: 'Database unavailable, please try again shortly' });
  }
});

// ----------------------
// ROUTES
// ----------------------

app.use('/api', tutorRoutes);
app.use('/api', studentRoutes);
app.use('/api/lms', lmsRoutes);
app.use('/api/lms/discussions', discussionRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Backend is running 🚀'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    message: 'Server is running smoothly',
    timestamp: new Date().toISOString()
  });
});

// ----------------------
// LOCAL DEV ONLY: run a persistent server when NOT on Vercel
// ----------------------

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error('MongoDB connection failed ❌', error);
    });
}

// ----------------------
// EXPORT (used by Vercel serverless runtime)
// ----------------------

export default app;