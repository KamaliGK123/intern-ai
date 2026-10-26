require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Connect to database
connectDB();

const app = express();
const httpServer = http.createServer(app);

// ==================== SOCKET.IO ====================
const io = new SocketIO(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Track online users: userId -> socketId
const onlineUsers = new Map();

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Client sends its userId after connecting
  socket.on('register', (userId) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
      socket.join(`user:${userId}`); // room per user
      logger.info(`Socket registered for user ${userId}`);
    }
  });

  socket.on('disconnect', () => {
    for (const [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) { onlineUsers.delete(uid); break; }
    }
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Expose io globally so controllers can emit events
app.set('io', io);

// ==================== SECURITY MIDDLEWARE ====================
app.use(helmet({ crossOriginEmbedderPolicy: false }));

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-webhook-secret'],
};
app.use(cors(corsOptions));

// Rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// ==================== REQUEST MIDDLEWARE ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ==================== ROOT & HEALTH ROUTES (no auth) ====================
app.get('/', (req, res) => res.json({ success: true, message: 'InternFlow AI API Server', version: '1.0.0' }));

app.get('/api', (req, res) => {
  res.json({
    success: true,
    service: 'InternFlow AI API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/health', '/api/auth', '/api/users', '/api/tasks',
      '/api/meetings', '/api/feedback', '/api/projects', '/api/modules',
      '/api/dashboard', '/api/ai', '/api/webhooks',
    ],
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'InternFlow AI API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'connected',
    socketClients: io.engine.clientsCount,
  });
});

// ==================== API ROUTES ====================
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const projectRoutes = require('./routes/projectRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const aiRoutes = require('./routes/aiRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/tasks', apiLimiter, taskRoutes);
app.use('/api/meetings', apiLimiter, meetingRoutes);
app.use('/api/feedback', apiLimiter, feedbackRoutes);
app.use('/api/projects', apiLimiter, projectRoutes);
app.use('/api/modules', apiLimiter, moduleRoutes);
app.use('/api/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/ai', apiLimiter, aiRoutes);
app.use('/api/webhooks', webhookRoutes);

// ==================== ERROR HANDLING ====================
app.use(notFound);
app.use(errorHandler);

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  logger.info(`InternFlow AI Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  logger.info(`Socket.IO ready — real-time events enabled`);
});

// Graceful shutdown
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Promise Rejection: ${err.message}`);
  httpServer.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully.');
  httpServer.close(() => process.exit(0));
});

module.exports = { app, io };
