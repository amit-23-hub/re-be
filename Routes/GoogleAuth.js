import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Candidate Google Auth
router.get('/google/candidate',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: 'candidate' // Explicitly setting state
  })
);

// Recruiter Google Auth
router.get('/google/recruiter',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: 'recruiter' // Explicitly setting state
  })
);

// Google Auth Callback
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    session: false 
  }),
  (req, res) => {
    // Ensure we have a user
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
    }

    // Determine role - check both possible fields
    const role = req.user.role || (req.user.companyEmail ? 'recruiter' : 'candidate');
    
    // Create token with consistent role/userType field
    const token = jwt.sign(
      { 
        id: req.user._id, 
        role: role,
        email: req.user.email || req.user.companyEmail 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

export default router;