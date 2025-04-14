import User from '../Models/UserModel.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../Services/email.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Login controller
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first',
        isVerified: false
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Step 1: Create temporary user
export const signupStep1 = async (req, res) => {
  try {
    const { fullName, countryCode, phoneNumber } = req.body;

    if (!fullName?.trim() || !countryCode || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    // Add temporary unique email
    const temporaryEmail = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}@temp.com`;

    const user = await User.create({
      fullName,
      countryCode,
      phoneNumber,
      email: temporaryEmail,  // Add this line
      role: 'candidate',
      signupStage: 1
    });

    res.status(201).json({
      success: true,
      userId: user._id
    });
  } catch (error) {
    console.error('Signup Step 1 Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Step 2: Add email/password and send verification
export const signupStep2 = async (req, res) => {
  try {
    const { email, password, confirmPassword, userId } = req.body;

    if (!email || !password || !confirmPassword || !userId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.email = email;
    user.password = password;
    user.verificationToken = token;
    user.tokenExpires = Date.now() + 3600000;
    user.signupStage = 2;
    await user.save();

    await sendVerificationEmail(email, token);

    res.json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    console.error('Signup Step 2 Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({
      verificationToken: token,
      tokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/verification-failed`);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.tokenExpires = undefined;
    user.signupStage = 3;
    await user.save();

    res.redirect(process.env.FRONTEND_VERIFICATION_SUCCESS_URL);
  } catch (error) {
    console.error('Verification Error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/verification-failed`);
  }
};

// Resend verification email
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.verificationToken = token;
    user.tokenExpires = Date.now() + 3600000;
    await user.save();

    await sendVerificationEmail(email, token);

    res.json({
      success: true,
      message: 'Verification email resent'
    });
  } catch (error) {
    console.error('Resend Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};