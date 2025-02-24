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
                resource_type: "video", // ✅ Ensures video processing
                folder: folder,
                chunk_size: 25000000, // ✅ 25MB chunk size for faster upload
                timeout: 900000, // ✅ 15 min timeout for large files
                invalidate: true, // ✅ Ensure old versions are replaced
            },
            (error, result) => {
                if (error) return reject(error);
                if (!result || !result.public_id || !result.secure_url) {
                    return reject(new Error("Failed to get Cloudinary response."));
                }
                resolve({
                    public_id: result.public_id,
                    secure_url: result.secure_url,
                });
            }
        );

        if (!fileStream) {
            return reject(new Error("Invalid file stream."));
        }

        fileStream.pipe(uploadStream); // ✅ Stream directly for efficiency
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
                timeout: 600000, // ✅ 10 min timeout
                invalidate: true, // ✅ Replace old uploads
            },
            (error, result) => {
                if (error) return reject(error);
                if (!result || !result.public_id || !result.secure_url) {
                    return reject(new Error("Failed to get Cloudinary response."));
                }
                resolve({
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
