import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const recruiterSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: [true, 'Full name is required'],
    trim: true
  },
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  companyEmail: { 
    type: String, 
    required: false, 
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        // Only validate if email exists
        if (!v) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  password: { 
    type: String, 
    required: false, 
    select: false
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  verificationToken: String,
  tokenExpires: Date,
  signupStage: { 
    type: Number, 
    default: 1,
    required: true
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  }
}, { 
  timestamps: true 
});

// Password hashing middleware
recruiterSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare password
recruiterSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Create indexes
recruiterSchema.index({ companyEmail: 1 }, { unique: true, sparse: true });
recruiterSchema.index({ googleId: 1 }, { unique: true, sparse: true });

const Recruiter = mongoose.model('Recruiter', recruiterSchema);
export default Recruiter;