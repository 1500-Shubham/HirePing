require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const passport = require('./config/passport');
const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const resumeRoutes = require('./routes/resume');
const plansRoutes = require('./routes/plans');
const sourcesRoutes = require('./routes/sources');
const emailsRoutes = require('./routes/emails');

const app = express();
const PORT = process.env.PORT || 4000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads/ directory');
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Mount routes under /api
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/sources', sourcesRoutes);
app.use('/api/emails', emailsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// Connect to database and start server
async function start() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log('HirePing server running on port ' + PORT);
      console.log('Environment: ' + process.env.NODE_ENV);
      console.log('Frontend URL: ' + process.env.FRONTEND_URL);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

start();
