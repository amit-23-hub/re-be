import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../Models/UserModel.js';
import Recruiter from '../Models/RecruiterModel.js';
import dotenv from 'dotenv';
dotenv.config();

// Serialization
passport.serializeUser((user, done) => {
  done(null, { 
    id: user._id, 
    role: user.role || (user.companyEmail ? 'recruiter' : 'candidate') 
  });
});

// Deserialization
passport.deserializeUser(async (data, done) => {
  try {
    let user;
    if (data.role === 'candidate') {
      user = await User.findById(data.id);
    } else {
      user = await Recruiter.findById(data.id);
    }
    
    if (!user) {
      throw new Error('User not found');
    }
    done(null, user);
  } catch (error) {
    console.error('Deserialization error:', error);
    done(error, null);
  }
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.Backend_URL}/api/auth/google/callback`,
    passReqToCallback: true,
    proxy: true // If behind a proxy
  },
  async function(req, accessToken, refreshToken, profile, done) {
    try {
      if (!profile.emails || !profile.emails.length) {
        throw new Error('No email provided by Google');
      }

      // More secure state handling
      const userType = req.query.state === 'recruiter' ? 'recruiter' : 'candidate';
      const email = profile.emails[0].value.toLowerCase();

      if (userType === 'candidate') {
        let user = await User.findOne({ 
          $or: [
            { email },
            { googleId: profile.id }
          ]
        });

        if (!user) {
          user = await User.create({
            fullName: profile.displayName,
            email,
            isVerified: true,
            googleId: profile.id,
            role: 'candidate'
          });
        } else if (!user.googleId) {
          // Update existing user with Google ID
          user.googleId = profile.id;
          await user.save();
        }
        return done(null, user);
      } else {
        // Recruiter logic
        let recruiter = await Recruiter.findOne({
          $or: [
            { companyEmail: email },
            { googleId: profile.id }
          ]
        });

        if (!recruiter) {
          recruiter = await Recruiter.create({
            fullName: profile.displayName,
            companyEmail: email,
            companyName: `${profile.displayName}'s Company`,
            isVerified: true,
            googleId: profile.id,
            signupStage: 2, // Mark as completed signup
            role: 'recruiter'
          });
        } else {
          // Update existing recruiter if needed
          if (!recruiter.googleId) {
            recruiter.googleId = profile.id;
            await recruiter.save();
          }
          if (!recruiter.isVerified) {
            recruiter.isVerified = true;
            await recruiter.save();
          }
        }
        return done(null, recruiter);
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      return done(error, null);
    }
  }
));

export default passport;