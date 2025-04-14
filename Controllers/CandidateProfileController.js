import CandidateProfile from '../Models/CandidateProfile.js';
import User from "../Models/UserModel.js"
import { uploadToCloudinary, deleteFromCloudinary } from '../Utils/fileUpload.js';

// Get full profile
export const getProfile = async (req, res) => {
  try {
    const profile = await CandidateProfile.findOne({ user: req.user.id })
      .populate('user', 'fullName email phoneNumber countryCode');
    
    if (!profile) {
      const user = await User.findById(req.user.id);
      return res.json({
        ...user.toObject(),
        basicInfo: {
          profileImage: null,
          title: '',
          bio: '',
          currentLocation: null,
          availability: '',
          experience: null
        },
        skills: [],
        education: [],
        socialLinks: {},
        identityVerification: null,
        resume: null
      });
    }
    
    const response = {
      ...profile.toObject(),
      fullName: profile.user?.fullName || '',
      email: profile.user?.email || '',
      phone: profile.user?.countryCode + profile.user?.phoneNumber || '',
      user: undefined
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update basic info
export const updateBasicInfo = async (req, res) => {
  try {
    const { title, bio, currentLocation, availability, experience } = req.body;
    let profile = await CandidateProfile.findOne({ user: req.user.id });
    
    if (!profile) {
      profile = new CandidateProfile({ user: req.user.id });
    }
    
    profile.basicInfo = { 
      ...profile.basicInfo, 
      title, 
      bio, 
      currentLocation: currentLocation ? JSON.parse(currentLocation) : profile.basicInfo.currentLocation,
      availability, 
      experience: experience ? JSON.parse(experience) : profile.basicInfo.experience
    };
    
    await profile.save();
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update profile image
// In Controllers/candidateProfileController.js
export const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Received file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    let profile = await CandidateProfile.findOne({ user: req.user.id });
    
    if (!profile) {
      profile = new CandidateProfile({ user: req.user.id });
    }

    // Delete old profile image if exists
    if (profile.basicInfo.profileImage?.fileId) {
      console.log('Deleting old image with fileId:', profile.basicInfo.profileImage.fileId);
      await deleteFromCloudinary(profile.basicInfo.profileImage.fileId);
    }

    const fileInfo = await uploadToCloudinary(req.file, 'profile-images');
    console.log('Uploaded file info:', fileInfo);

    profile.basicInfo.profileImage = {
      url: fileInfo.url,
      fileId: fileInfo.key,  // Changed from publicId to key
      name: fileInfo.originalName,
      size: fileInfo.size,
      format: fileInfo.format,
      lastUpdated: new Date()
    };

    await profile.save();
    console.log('Profile after save:', profile);
    
    res.json({
      url: fileInfo.url,
      message: 'Profile image updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile image:', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
      file: req.file ? {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      } : null
    });
    res.status(500).json({ error: error.message });
  }
};

// Update resume and skills

export const updateResumeSkills = async (req, res) => {
  try {
    const { skills } = req.body;
    let profile = await CandidateProfile.findOne({ user: req.user.id });
    
    if (!profile) {
      profile = new CandidateProfile({ user: req.user.id });
    }

    // Handle resume file upload if present
    if (req.file) {
      // Delete old resume if exists
      if (profile.resume?.publicId) {
        await deleteFromCloudinary(profile.resume.publicId);
      }

      const fileInfo = await uploadToCloudinary(req.file, 'resumes');
      profile.resume = {
        url: fileInfo.url,
        publicId: fileInfo.publicId,
        originalName: req.file.originalname,
        size: fileInfo.size
      };
    }

    // Update skills
    if (Array.isArray(skills)) {
      profile.skills = skills;
    }

    await profile.save();
    res.json(profile);
  } catch (error) {
    console.error('Error updating resume and skills:', error);
    res.status(500).json({ error: error.message });
  }
};
// Update education - Modified to properly parse education data
export const updateEducation = async (req, res) => {
  try {
    const { education } = req.body;
    
    // Parse the JSON string if it's a string
    const educationArray = typeof education === 'string' 
      ? JSON.parse(education) 
      : education;
    
    if (!Array.isArray(educationArray)) {
      return res.status(400).json({ error: 'Education must be an array' });
    }

    let profile = await CandidateProfile.findOne({ user: req.user.id });
    
    if (!profile) {
      profile = new CandidateProfile({ user: req.user.id });
    }
    
    // Process education dates and format them properly
    profile.education = educationArray.map(edu => ({
      schoolName: edu.schoolName,
      degreeType: edu.degreeType,
      startDate: edu.startDate,
      endDate: edu.current ? 'Present' : edu.endDate,
      current: edu.current || false
    }));

    await profile.save();
    res.json(profile);
  } catch (error) {
    console.error('Error updating education:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update resume and skills - Modified to properly handle skills


// Update identity verification
export const updateIdentityVerification = async (req, res) => {
  try {
    const { proofType, fullAddress, verificationConsent } = req.body;
    const proofFile = req.file;
    
    let profile = await CandidateProfile.findOne({ user: req.user.id });
    
    if (!profile) {
      profile = new CandidateProfile({ user: req.user.id });
    }

    if (proofFile) {
      // Delete old proof document if exists
      if (profile.identityVerification?.proofDocument?.publicId) {
        await deleteFromCloudinary(profile.identityVerification.proofDocument.publicId);
      }
    
      const fileInfo = await uploadToCloudinary(proofFile, 'identity-proofs');
      profile.identityVerification = {
        proofType,
        proofDocument: {
          url: fileInfo.url,
          publicId: fileInfo.publicId,
          originalName: proofFile.originalname,
          size: fileInfo.size,
          format: fileInfo.format,
          verified: false
        },
        fullAddress,
        verificationConsent: verificationConsent === 'true' || verificationConsent === true,
        verificationStatus: 'Pending'
      };
    } else {
      // Update other fields even if no new file is uploaded
      profile.identityVerification = {
        ...profile.identityVerification,
        proofType,
        fullAddress,
        verificationConsent: verificationConsent === 'true' || verificationConsent === true,
        verificationStatus: 'Pending'
      };
    }
    
    await profile.save();
    res.json(profile);
  } catch (error) {
    console.error('Error updating identity verification:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update social links
export const updateSocialLinks = async (req, res) => {
  try {
    const { linkedin, github, portfolio, personalWebsite } = req.body;
    let profile = await CandidateProfile.findOne({ user: req.user.id });
    
    if (!profile) {
      profile = new CandidateProfile({ user: req.user.id });
    }
    
    profile.socialLinks = { 
      linkedin: linkedin || '',
      github: github || '',
      portfolio: portfolio || '',
      personalWebsite: personalWebsite || '' 
    };
    
    await profile.save();
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};