import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import authRoutes from './Routes/UserAuth.js';
import recruiterAuthRoutes from './Routes/RecruiterAuth.js';
import candidateProfileRoutes from './Routes/CandidateProfileRoutes.js';
import passport from './config/passport.js';
import googleAuthRoutes from './Routes/GoogleAuth.js';
import connectDB from './Config/Db.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const API_BASE = '/api';

// Middleware Configuration
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(passport.initialize());

// Static Files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API Routes
app.use(`${API_BASE}/auth`, googleAuthRoutes); // Google Auth should come first
app.use(`${API_BASE}/auth`, authRoutes);
app.use(`${API_BASE}/recruiter`, recruiterAuthRoutes);
app.use(`${API_BASE}/candidate`, candidateProfileRoutes);

// Health Check Endpoint
app.get(`${API_BASE}/health`, (req, res) => {
  res.json({ 
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    serverTime: new Date().toISOString()
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  const errorResponse = {
    error: err.name || 'Internal Server Error',
    message: err.message
  };

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      ...errorResponse,
      details: err.message
    });
  }

  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    return res.status(500).json({
      ...errorResponse,
      details: 'Database operation failed'
    });
  }

  res.status(err.status || 500).json(errorResponse);
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist'
  });
});

export default app;