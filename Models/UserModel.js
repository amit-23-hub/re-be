import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  countryCode: { 
    type: String, 
    required: [true, 'Country code is required'],
    default: '+91'
  },
  phoneNumber: { 
    type: String, 
    required: [true, 'Phone number is required'],
    unique: true,
    validate: {
      validator: function(v) {
        return /^\d{10,15}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  email: { 
    type: String, 
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  password: { 
    type: String, 
    select: false,
    minlength: [8, 'Password must be at least 8 characters long']
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  verificationToken: String,
  tokenExpires: Date,
  role: { 
    type: String, 
    enum: ['candidate', 'recruiter'], 
    default: 'candidate' 
  },
  signupStage: { 
    type: Number, 
    default: 1,
    min: 1,
    max: 3
  },  // Add comma here
  googleId: {
    type: String,
    sparse: true,
    unique: true
  }
}, { 
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.verificationToken;
      return ret;
    }
  }
});

// Indexes
// userSchema.index({ phoneNumber: 1 }, { unique: true });
// userSchema.index({ email: 1 }, { 
//   unique: true,
//   partialFilterExpression: { email: { $exists: true } } 
// });

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;