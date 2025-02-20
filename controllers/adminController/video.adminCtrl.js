const fs = require('fs');
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
    const { title, description, category, video } = req.body;
    try {
        if (!req.files) return res.status(404).json({ success: false, message: 'file is required' });

        const thumbnailFile = req.files.thumbnail[0].path;
        const videoFile = req.files.video[0].path;
        let videoData;

        const imageData = await uploadImageOnCloudinary(thumbnailFile, 'VleThumbnails');
        if (video && isValidURL(video)) {
            videoData = await uploadVideoFromURL(video, 'VleVideos')
        } else {
            videoData = await uploadVideoOnCloudinary(videoFile, 'VleVideos');
        }

        const videoData_ = await Video({
            title, description, category,
            thumbnail: { url: imageData.secure_url, publicId: imageData.public_id },
            video: { url: videoData.secure_url, publicId: videoData.public_id }
        });
        await videoData_.save();

        clearCache('node-cache');
        fs.unlinkSync(videoFile);

        res.status(200).json({
            success: true,
            message: "Video uploaded successfully...!",
            data: videoData_
        });
    } catch (error) {
        next(error);
    }
};

// update video
exports.updateVideo = async (req, res, next) => {
    const { title, description, category } = req.body;
    const { videoId } = req.params;

    try {
        const videoDoc = await Video.findById(videoId);
        if (!videoDoc) return res.status(404).json({ success: false, message: "Video not found" });

        // 🔹 Update thumbnail if new file provided
        if (req.files?.thumbnail) {
            await deleteImageOnCloudinary(videoDoc.thumbnail.publicId);
            const newImage = await uploadImageOnCloudinary(req.files.thumbnail[0].path, "VleThumbnails");
            videoDoc.thumbnail = { url: newImage.secure_url, publicId: newImage.public_id };
        }

        // 🔹 Update video file if new file provided
        if (req.files?.video) {
            await deleteVideoOnCloudinary(videoDoc.video.publicId);
            const newVideo = await uploadVideoOnCloudinary(req.files.video[0].path, "VleVideos");
            videoDoc.video = { url: newVideo.secure_url, publicId: newVideo.public_id };
            fs.unlinkSync(req.files.video[0].path);
        }

        // 🔹 Update text fields if provided
        if (title) videoDoc.title = title;
        if (description) videoDoc.description = description;
        if (category) videoDoc.category = category;

        await videoDoc.save();
        clearCache('node-cache');
        res.status(200).json({ success: true, message: "Video updated successfully!", data: videoDoc });
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
