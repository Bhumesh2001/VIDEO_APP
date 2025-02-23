const Busboy = require("busboy");
const Video = require('../../models/adminModel/video.adminModel');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');
const { isValidURL } = require('../../utils/validateUtil');
const {
    uploadImageOnCloudinary,
    uploadVideoOnCloudinary,
    deleteImageOnCloudinary,
    deleteVideoOnCloudinary,
    uploadVideoFromURL,
} = require('../../utils/uploadUtil');

// Get all videos
exports.getAllVideos = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 12, 1);
        const skip = (page - 1) * limit;

        const [videos, totalVideos] = await Promise.all([
            Video.find({}, { __v: 0, createdAt: 0, updatedAt: 0 })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Video.countDocuments(),
        ]);

        if (videos.length === 0) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: "Videos not found",
            });
        }

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Videos fetched successfully...',
            totalVideos,
            totalPages: Math.ceil(totalVideos / limit),
            page,
            videos,
        });
    } catch (error) {
        next(error);
    }
};

// Get all videos by category 
exports.getAllVideosByCategory = async (req, res, next) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({
                success: false,
                status: 404,
                message: 'Category is required',
            });
        }

        const videosByCategory = await Video.find({ category }, { __v: 0, createdAt: 0, updatedAt: 0 })
            .lean()
            .exec();
        if (videosByCategory.length === 0) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: 'No videos found for this category',
            });
        }

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Videos fetched successfully',
            videosByCategory,
        });
    } catch (error) {
        next(error);
    }
};

// Get video by id
exports.getVideoById = async (req, res, next) => {
    try {
        // Fetch video details
        const video = await Video.findById(req.params.videoId).lean();
        if (!video) {
            return res.status(404).json({ success: false, message: "Video not found" });
        }

        res.status(200).json({
            success: true,
            message: "Video fetched successfully...!",
            data: {
                title: video.title,
                description: video.description,
                category: video.category,
                thumbnail: video.thumbnail,
                video: video.video || null, // If available
            },
        });
    } catch (error) {
        next(error);
    }
};

// Upload video on Cloudinary
exports.uploadVideo = async (req, res, next) => {
    try {
        const bb = Busboy({ headers: req.headers });

        let videoData = { url: "", publicId: "" };
        let imageData = { url: "", publicId: "" };
        let formData = { title: "", description: "", category: "", video: "" };

        let thumbnailUploadPromise = Promise.resolve();
        let videoUploadPromise = Promise.resolve();

        bb.on("field", (fieldname, val) => {
            if (["title", "description", "category", "video"].includes(fieldname)) {
                formData[fieldname] = val;
            }
        });

        bb.on("file", (fieldname, file, filename) => {
            if (fieldname === "thumbnail") {
                thumbnailUploadPromise = uploadImageOnCloudinary(file, "VleThumbnails").then(data => {
                    imageData.url = data.secure_url;
                    imageData.publicId = data.public_id;
                });
            }

            if (fieldname === "video") {
                isVideoUploaded = true;
                videoUploadPromise = uploadVideoOnCloudinary(file, "VleVideos").then(data => {
                    videoData.url = data.secure_url;
                    videoData.publicId = data.public_id;
                    console.log(videoData,'===');
                    
                });
            }
        });

        bb.on("finish", async () => {
            try {
                // ✅ Ensure thumbnail upload completes
                await thumbnailUploadPromise;

                // ✅ Handle Video Upload (File or URL)
                if (formData.video && isValidURL(formData.video)) {
                    const videoData_ = await uploadVideoFromURL(formData.video, "VleVideos");
                    console.log(videoData_, '====');

                    videoData.url = videoData_.secure_url
                    videoData.publicId = videoData_.public_id
                } else {
                    await videoUploadPromise; // ✅ Ensure file video is uploaded
                }

                // ✅ Check if video was actually uploaded
                if (!videoData.url || !videoData.publicId) {
                    return res.status(400).json({ success: false, message: "Video upload failed!" });
                }

                // ✅ Save to DB
                const newVideo = new Video({
                    title: formData.title,
                    description: formData.description,
                    category: formData.category,
                    thumbnail: { url: imageData.url, publicId: imageData.publicId },
                    video: { url: videoData.url, publicId: videoData.publicId },
                });

                await newVideo.save();

                // ✅ Clear Cache
                clearCache("node-cache");

                res.status(200).json({
                    success: true,
                    message: "Video uploaded successfully!",
                    data: newVideo,
                });
            } catch (error) {
                next(error);
            }
        });

        req.pipe(bb);
    } catch (error) {
        next(error);
    }
};

// update video
exports.updateVideo = async (req, res, next) => {
    try {
        const { videoId } = req.params;
        const videoDoc = await Video.findById(videoId);
        if (!videoDoc) return res.status(404).json({ success: false, message: "Video not found" });

        const bb = Busboy({ headers: req.headers });

        let updatedFields = {};
        let thumbnailUploadPromise = Promise.resolve();
        let videoUploadPromise = Promise.resolve();

        bb.on("field", (fieldname, val) => {
            if (["title", "description", "category"].includes(fieldname)) {
                updatedFields[fieldname] = val;
            }
        });

        bb.on("file", (fieldname, file, filename) => {
            if (fieldname === "thumbnail") {
                // Delete old thumbnail
                deleteImageOnCloudinary(videoDoc.thumbnail.publicId);

                // Upload new thumbnail
                thumbnailUploadPromise = uploadImageOnCloudinary(file, "VleThumbnails").then(data => {
                    updatedFields.thumbnail = { url: data.secure_url, publicId: data.public_id };
                });
            }

            if (fieldname === "video") {
                // Delete old video
                deleteVideoOnCloudinary(videoDoc.video.publicId);

                // Upload new video
                videoUploadPromise = uploadVideoOnCloudinary(file, "VleVideos").then(data => {
                    updatedFields.video = { url: data.secure_url, publicId: data.public_id };
                });
            }
        });

        bb.on("finish", async () => {
            try {
                await Promise.all([thumbnailUploadPromise, videoUploadPromise]);

                // 🔹 Update document with new data
                Object.assign(videoDoc, updatedFields);
                await videoDoc.save();

                // 🔹 Clear cache
                clearCache("node-cache");

                res.status(200).json({
                    success: true,
                    message: "Video updated successfully!",
                    data: videoDoc,
                });
            } catch (error) {
                next(error);
            }
        });

        req.pipe(bb);
    } catch (error) {
        next(error);
    }
};

// delete video
exports.deleteVideo = async (req, res, next) => {
    const { videoId } = req.params;

    try {
        const videoDoc = await Video.findById(videoId);
        if (!videoDoc) return res.status(404).json({ success: false, message: "Video not found" });

        // 🔹 Delete from Cloudinary
        await deleteImageOnCloudinary(videoDoc.thumbnail.publicId);
        await deleteVideoOnCloudinary(videoDoc.video.publicId);

        // 🔹 Delete from Database
        await Video.findByIdAndDelete(videoId);
        clearCache('node-cache');

        res.status(200).json({ success: true, message: "Video deleted successfully!" });
    } catch (error) {
        next(error);
    }
};
