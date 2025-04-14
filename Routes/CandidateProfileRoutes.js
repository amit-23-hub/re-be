import express from 'express';
import { body } from 'express-validator';
import { authenticateToken, isCandidate } from '../Middleware/auth.js';
import {
  getProfile,
  updateBasicInfo,
  updateResumeSkills,
  updateEducation,
  updateIdentityVerification,
  updateSocialLinks,
  updateProfileImage
} from '../Controllers/CandidateProfileController.js';
import { uploadResume, uploadIdentityDoc, uploadProfileImage } from '../Utils/fileUpload.js';

const router = express.Router();

// Get profile
router.get('/profile', authenticateToken, isCandidate, getProfile);

// Profile image upload
router.put('/profile-image',
  authenticateToken,
  isCandidate,
  uploadProfileImage,
  updateProfileImage
);

// Step 1: Basic Info
router.put('/basic-info', 
  authenticateToken, 
  isCandidate,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('currentLocation').optional().isString(),
    body('availability').optional().isIn(['Immediate', '15 Days', '30 Days', '60 Days', 'Not Available'])
  ], 
  updateBasicInfo 
);

// Step 2: Resume & Skills
// Update education route - Remove the JSON string validation
router.put('/education',
  authenticateToken,
  isCandidate,
  updateEducation
);

// Update resume-skills route - Adjust for FormData
router.put('/resume-skills',
  authenticateToken,
  isCandidate,
  uploadResume,
  updateResumeSkills
);

// Step 4: Identity Verification
router.put('/identity-verification',
  authenticateToken,
  isCandidate,
  uploadIdentityDoc,
  [
    body('proofType').isIn(['Aadhar Card', 'Passport', "Driver's License"]).withMessage('Invalid proof type'),
    body('fullAddress').notEmpty().withMessage('Full address is required'),
    body('verificationConsent').isBoolean().withMessage('Verification consent must be a boolean')
  ],
  updateIdentityVerification
);

// Step 5: Social Links
router.put('/social-links',
  authenticateToken,
  isCandidate,
  [
    body('linkedin').optional().isURL().withMessage('Invalid LinkedIn URL'),
    body('github').optional().isURL().withMessage('Invalid GitHub URL'),
    body('portfolio').optional().isURL().withMessage('Invalid Portfolio URL'),
    body('personalWebsite').optional().isURL().withMessage('Invalid Website URL')
  ],
  updateSocialLinks
);

export default router;