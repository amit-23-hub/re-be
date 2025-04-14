import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Configure AWS S3
const s3Client = new S3Client({
  region: 'ap-south-1', // Hardcoded Mumbai region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  // Add endpoint configuration for Mumbai
  endpoint: 'https://s3.ap-south-1.amazonaws.com',
  // Force path style for bucket naming (important for some regions)
  forcePathStyle: true
});

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF, JPEG, and PNG files are allowed.`), false);
  }
};

// Create multer instance with configuration
const multerUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Generate random file name with original extension
const generateFileName = (originalName) => {
  const ext = originalName.split('.').pop();
  return `${crypto.randomBytes(16).toString('hex')}.${ext}`;
};

// Export specific upload middlewares
export const uploadResume = multerUpload.single('resume');
export const uploadIdentityDoc = multerUpload.single('file');
export const uploadProfileImage = multerUpload.single('profileImage');

// Upload to S3 function with enhanced error handling
// In Utils/fileUpload.js
export const uploadToS3 = async (file, folder = 'general') => {
  try {
    if (!file?.buffer || !file?.originalname) {
      throw new Error('Invalid file input: Missing buffer or filename');
    }

    if (!process.env.AWS_BUCKET_NAME) {
      throw new Error('AWS_BUCKET_NAME is not configured');
    }

    const fileName = `${folder}/${crypto.randomBytes(16).toString('hex')}-${file.originalname}`;
    
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      // ACL: 'public-read',  // Ensure public access to the uploaded file
      Metadata: {
        originalName: file.originalname,
        uploadedBy: 'candidate-profile',
        uploadTime: new Date().toISOString()
      }
    };

    console.log('Uploading to S3 with params:', {
      Bucket: params.Bucket,
      Key: params.Key,
      ContentType: params.ContentType,
      Size: file.size
    });

    const uploadResult = await s3Client.send(new PutObjectCommand(params));
    console.log('S3 upload result:', uploadResult);

    return {
      url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${fileName}`,
      key: fileName,
      originalName: file.originalname,
      size: file.size,
      format: file.mimetype.split('/').pop()
    };
  } catch (error) {
    console.error('Detailed S3 Upload Error:', {
      error: error.message,
      stack: error.stack,
      awsConfig: {
        region: process.env.AWS_REGION,
        bucket: process.env.AWS_BUCKET_NAME,
        accessKey: process.env.AWS_ACCESS_KEY_ID ? 'configured' : 'missing'
      }
    });
    throw error;
  }
};

// Delete file from S3 with validation
export const deleteFromS3 = async (key) => {
  if (!key) return false;
  
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    }));
    return true;
  } catch (error) {
    console.error('S3 Deletion Error:', {
      key,
      error: error.message
    });
    throw new Error(`Deletion failed: ${error.message}`);
  }
};

// Backward compatibility
export const uploadToCloudinary = uploadToS3;
export const deleteFromCloudinary = deleteFromS3;