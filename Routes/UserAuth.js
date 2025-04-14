import express from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import {
  login,
  signupStep1,
  signupStep2,
  verifyEmail,
  resendVerification
} from '../Controllers/UserAuthController.js';

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
router.use(authLimiter);

// Routes
router.post('/login', login);
router.post('/signup/step1', signupStep1);
router.post('/signup/step2', signupStep2);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

export default router;