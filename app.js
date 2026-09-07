import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import dns from 'node:dns';

import { setupSocketIO } from './utils/socketHandler.js';

import tutorRoutes from './routers/tutorRouter.js';
import studentRoutes from './routers/studentRouter.js';
import lmsRoutes from './routers/Lmsroutes.js';
import discussionRoutes from './routes/discussionRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

import { seedGamesIfEmpty } from './utils/seedCodingGames.js';

// Force Node.js to use Google / Cloudflare DNS
dns.setServers([
  '8.8.8.8',
  '1.1.1.1'
]);

const app = express();
const httpServer = http.createServer(app);

// Setup Socket.IO
setupSocketIO(httpServer, app);

// ----------------------
// MIDDLEWARE
// ----------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://lms-frontend-smts.vercel.app',
    'https://lms.sharpenedmindtechnologies.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

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
// DATABASE + SERVER
// ----------------------

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected ✅');

    await seedGamesIfEmpty();

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed ❌', error);
  });