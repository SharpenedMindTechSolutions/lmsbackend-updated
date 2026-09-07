import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

export const setupSocketIO = (httpServer, app) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'https://lms-frontend-smts.vercel.app',
        'https://lms.sharpenedmindtechnologies.com'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Make io accessible in express routes
  app.set('io', io);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      if (!token) return next(new Error('Authentication error'));
      
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      
      // We are reusing the JWT secret from process.env.JWT_SECRET (make sure it matches verifyStudent/verifyTutor)
      // verifyStudent.js uses process.env.JWT_SECRET
      jwt.verify(cleanToken, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.user = decoded;
        next();
      });
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected via socket: ${socket.user.id}`);

    // Join a room for a specific session discussion
    socket.on('join_session', (sessionId) => {
      if (sessionId) {
        socket.join(sessionId);
        console.log(`User ${socket.user.id} joined session room ${sessionId}`);
      }
    });

    socket.on('leave_session', (sessionId) => {
      if (sessionId) {
        socket.leave(sessionId);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });

  return io;
};
