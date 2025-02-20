// multerConfig.js
const multer = require('multer');
const cloudinary = require('./cloudinaryConfig');
const { v2: cloudinaryV2 } = require('cloudinary');
const streamifier = require('streamifier');

// Allowed file types
const allowedFiles = ['image/jpeg', 'image/jpg', 'image/png'];
const maxFileSize = 5 * 1024 * 1024; // 5MB

// Set up Multer memory storage
const storage = multer.memoryStorage();

// Multer instance with enhanced error handling
const multerUpload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 ,
        files: 8
    },
    fileFilter: (req, file, cb) => {
        // Check if file exists
        if (!file) {
            cb(new Error('No file provided'), false);
            return;
        }

        // Check file type
        if (!allowedFiles.includes(file.mimetype)) {
            cb(new Error('Invalid file type. Only JPG, JPEG, and PNG files are allowed.'), false);
            return;
        }

        // Check if buffer exists for blob data
        if (file.buffer && file.buffer.length === 0) {
            cb(new Error('Empty file uploaded'), false);
            return;
        }

        cb(null, true);
    }
}).array('images', 8);



const uploadToCloudinary = async (file) => {
    return new Promise((resolve, reject) => {
        // Validate file before upload
        if (!file || !file.buffer) {
            reject(new Error('Invalid file data'));
            return;
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'auto',
                folder: 'nexora_images',
                allowed_formats: ['jpg', 'jpeg', 'png'],
                transformation: [
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' }
                ]
            },
            (error, result) => {
                if (error) reject(new Error(`Cloudinary upload failed: ${error.message}`));
                else resolve(result);
            }
        );

        // Handle potential streaming errors
        uploadStream.on('error', (error) => {
            reject(new Error(`Stream error: ${error.message}`));
        });

        streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
};

// Enhanced middleware with better error handling
module.exports = {
    multerUpload: (req, res, next) => {
        multerUpload(req, res, async (err) => {
            try {
                // Handle multer errors
                if (err instanceof multer.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return res.status(400).json({
                            success: false,
                            message: `File size should not exceed ${maxFileSize / (1024 * 1024)}MB`
                        });
                    }
                    // if (err.code === 'LIMIT_FILE_COUNT') {
                    //     return res.status(400).json({
                    //         success: false,
                    //         message: 'Maximum 4 images allowed'
                    //     });
                    // }    
                    return res.status(400).json({
                        success: false,
                        message: err.message
                    });
                }

                // Handle other errors
                if (err) {
                    return res.status(400).json({
                        success: false,
                        message: err.message
                    });
                }


                // Validate each file has proper buffer data
                const invalidFiles = req.files.filter(file => !file.buffer || file.buffer.length === 0);
                if (invalidFiles.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'One or more files contain invalid data'
                    });
                }

                next();
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Error processing upload'
                });
            }
        });
    },
    uploadToCloudinary
};