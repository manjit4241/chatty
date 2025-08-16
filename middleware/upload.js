const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chatapp',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi', 'mp3', 'wav', 'pdf', 'doc', 'docx'],
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' }, // Limit image size
      { quality: 'auto' } // Auto optimize quality
    ]
  }
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/mov',
      'video/avi',
      'audio/mp3',
      'audio/wav',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, audio, and documents are allowed.'), false);
    }
  }
});

// Single file upload
const uploadSingle = upload.single('file');

// Multiple files upload
const uploadMultiple = upload.array('files', 5); // Max 5 files

// Profile photo upload (images only)
const profilePhotoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chatapp/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Square crop with face detection
      { quality: 'auto' }
    ]
  }
});

const profilePhotoUpload = multer({
  storage: profilePhotoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for profile photos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed for profile photos.'), false);
    }
  }
}).single('profilePhoto');

// Middleware wrapper for error handling
const handleUpload = (uploadFunction) => {
  return (req, res, next) => {
    uploadFunction(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 10MB.'
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Delete file from Cloudinary
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

// Get file info from Cloudinary
const getFileInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    console.error('Error getting file info from Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  uploadSingle: handleUpload(uploadSingle),
  uploadMultiple: handleUpload(uploadMultiple),
  profilePhotoUpload: handleUpload(profilePhotoUpload),
  deleteFile,
  getFileInfo,
  cloudinary
};

