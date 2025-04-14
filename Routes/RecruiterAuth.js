import express from 'express';
import { body } from 'express-validator';
import {
  recruiterSignupStep1,
  recruiterSignupStep2,
  recruiterLogin,
  verifyRecruiterEmail,
  resendVerification
} from '../Controllers/RecruiterAuthController.js';

const router = express.Router();

// Signup Step 1 validation
router.post('/signup/step1', [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('companyName').trim().notEmpty().withMessage('Company name is required')
], recruiterSignupStep1);

// Signup Step 2 validation
router.post('/signup/step2', [
  body('companyEmail').isEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
], recruiterSignupStep2);

// Login route
router.post('/login', recruiterLogin);

// Email verification routes
router.get('/verify-email', verifyRecruiterEmail);  // Remove the body validation since token comes from query

// router.get('/verify-email/recruiter/:token', (req, res)=>{
//   res.send("Email verifieddddd") ;
// });

// Add a route to resend verification email
router.post('/resend-verification', [
  body('email').isEmail().withMessage('Valid email is required')
], resendVerification);

export default router;
