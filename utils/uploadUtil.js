const { cloudinary } = require('../config/cloudinary');

// ✅ Upload Image Stream to Cloudinary
exports.uploadImageOnCloudinary = async (fileStream, folder = "") => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "image",
                folder: folder,
                format: "webp", // Auto-convert to WebP for better compression
                transformation: [{ width: 800, height: 450, crop: "limit", quality: "auto" }],
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );

        fileStream.pipe(uploadStream); // Stream file directly to Cloudinary
    });
};

// ✅ Upload Video Stream to Cloudinary
exports.uploadVideoOnCloudinary = async (fileStream, folder = "VleVideos") => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "auto", // ✅ Automatically detects file type
                folder: folder,
                async: true, // ✅ Enable asynchronous processing
                eager_async: true, // ✅ Process transformations asynchronously
                chunk_size: 25000000, // ✅ Increase chunk size to 25MB for faster upload
                timeout: 900000, // ✅ 15 min timeout for large files
                backup: false, // ✅ Disable backup to avoid unnecessary storage
                invalidate: true, // ✅ Ensure new uploads replace old ones faster
            },
            (error, result) => {
                if (error) reject(error);
                else resolve({
                    public_id: result.public_id,
                    secure_url: result.secure_url,
                });
            }
        );

        fileStream.pipe(uploadStream); // ✅ Stream file directly to Cloudinary for faster upload
    });
};

// ✅ Upload Video from URL to Cloudinary
exports.uploadVideoFromURL = async (videoURL, folder = "VleVideos") => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
            videoURL,
            {
                resource_type: "video",
                folder: folder,
                async: true, // ✅ Enables asynchronous processing for faster uploads
                eager_async: true, // ✅ Process transformations asynchronously
                chunk_size: 10000000, // ✅ 10MB chunks for faster uploads
                timeout: 600000, // ✅ 10 minutes timeout for large files
                backup: false, // ✅ Avoid unnecessary backup storage
            },
            (error, result) => {
                if (error) reject(error);
                else resolve({
                    public_id: result.public_id,
                    secure_url: result.secure_url,
                });
            }
        );
    });
};

// ✅ Delete Image from Cloudinary
exports.deleteImageOnCloudinary = async (publicId) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
            if (error) reject(error);
            else resolve(result);
        });
    });
};

// ✅ Delete Video from Cloudinary
exports.deleteVideoOnCloudinary = async (publicId) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(
            publicId,
            { resource_type: "video" },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
    });
};
