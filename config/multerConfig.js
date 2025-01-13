// multerConfig.js
const multer = require('multer');
const cloudinary = require('./cloudinaryConfig');
const { v2: cloudinaryV2 } = require('cloudinary');
const streamifier = require('streamifier');

// Set up Multer memory storage
const storage = multer.memoryStorage();

// Create multer instance
const multerUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'auto',
                folder: 'nexora_images',
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
};

// Export the multer middleware directly
module.exports = multerUpload;
// Export uploadToCloudinary separately if needed
module.exports.uploadToCloudinary = uploadToCloudinary;