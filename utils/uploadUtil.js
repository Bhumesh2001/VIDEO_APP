const multer = require("multer");
const fs = require('fs');
const path = require("path");
const { cloudinary } = require('../config/cloudinary');

// 🔹 Disk Storage Setup (Sabhi Files Save Honge)
const storage = multer.diskStorage({
    destination: "uploads/", // File temporary save hogi
    filename: (req, file, cb) => {
        cb(null, Date.now() + "_" + file.originalname);
    },
});
exports.upload = multer({ storage });

// 🔹 Function to Delete All Files in Uploads Directory
exports.clearTempFiles = async () => {
    const files = fs.readdirSync("uploads/");

    // Function to delete file with retry logic
    const deleteFileWithRetry = async (filePath) => {
        let attempt = 0;
        while (attempt < 3) {
            try {
                fs.unlinkSync(filePath);
                return;
            } catch (deleteError) {
                attempt++;
                if (attempt < 3) {
                    console.error(`Attempt ${attempt} failed, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Retry after 1 second
                } else {
                    console.error(`Failed to delete file after 3 attempts: ${deleteError.message}`);
                }
            }
        }
    };

    // Iterate through files and delete them
    for (const file of files) {
        await deleteFileWithRetry(path.join("uploads/", file));
    };
};

// 🔹 Upload Video using Streams
exports.uploadVideoOnCloudinary = async (filePath, folder) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "video",
                chunk_size: 10000000, // 6MB chunks for stability
                timeout: 300000, // 5 min timeout
                folder: folder || "VleVideos",
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );

        // 🔹 Read file as a stream & pipe to Cloudinary
        fs.createReadStream(filePath).pipe(uploadStream);
    });
};

// Delete video on cloudinary
exports.deleteVideoOnCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: "video",
        });
    } catch (error) {
        console.error("Delete Error:", error.message);
    }
};

// Function to delete the image on cloudinary
exports.deleteImageOnCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        throw new Error(`Error deleting image: ${error.message}`);
    }
};

// 🔹 Cloudinary File Upload (Using File Path)
exports.uploadImageOnCloudinary = async (filePath, folder = "") => {
    try {
        if (!fs.existsSync(filePath)) throw new Error("File not found!");

        // 🔹 Upload the file from disk
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto", // Auto-detect file type (image, video, etc.)
            folder: folder,        // Optional: Store in a specific folder
            format: "webp",        // Convert images to WebP (better compression)
            transformation: [{ width: 800, height: 450, crop: "limit", quality: "auto" }],
        });

        // 🔹 Delete file from disk after upload
        fs.unlinkSync(filePath);

        return result;
    } catch (error) {
        console.error("Cloudinary Upload Error:", error.message);
        throw new Error("File upload failed");
    }
};

// 🔹 Optimized Upload Function
exports.uploadVideoFromURL = async (videoURL, folder) => {
    if (!videoURL) throw new Error("Video URL is required!");

    try {
        const data = await cloudinary.uploader.upload(videoURL, {
            resource_type: "video",
            folder: folder || "VleVideos",
            chunk_size: 12000000, // 12MB chunks for stability
            timeout: 300000, // 5 min timeout
        });

        return data;
    } catch (error) {
        console.error("Upload Error:", error.message);
        throw new Error("Cloudinary upload failed. Please try again.");
    }
};
