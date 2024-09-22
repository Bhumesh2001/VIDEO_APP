const fs = require('fs').promises
const Mega = require('megajs');

const Category = require('../../models/adminModel/category.adminModel');
const Video = require('../../models/adminModel/video.adminModel');

const { uploadImage, uploadVideo } = require('../../utils/uploadUtil');

// ------------- upload video -----------------

const videoOptions = {
    folder: 'Videos',
};
const thumbnailOptions = {
    folder: 'thumbnails',
    transformation: [
        { width: 1280, height: 720, crop: 'fill' }
    ],
};

exports.uploadVideoToCloudinary = async (req, res) => {
    try {
        const { title, description, category, video, thumbnail } = req.body;

        // Validate required fields
        if (!title || !description || !category || (!video && !req.files?.video) || (!thumbnail && !req.files?.thumbnail)) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, category, video, and thumbnail are required.',
            });
        }

        // Check category availability
        const isCategoryAvailable = await Category.findOne({ name: category }).exec();
        if (!isCategoryAvailable) {
            return res.status(404).json({ success: false, message: 'Category is not available!' });
        }

        // Check for existing video
        if (await Video.findOne({ title }).exec()) {
            return res.status(409).json({ success: false, message: 'Video already exists!' });
        }

        const videoObj = { title, description, category };
        const videoData = { video: {}, thumbnail: {} };

        const tempVideo = new Video(videoObj);
        const validationError = tempVideo.validateSync();
        if (validationError) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: Object.values(validationError.errors).map(err => err.message),
            });
        }

        // Upload video
        if (req.files?.video) {
            const videoResult = await uploadVideo(req.files.video.tempFilePath, videoOptions);
            videoData.video = { publicId: videoResult.public_id, url: videoResult.url };
            await fs.unlink(req.files.video.tempFilePath);
        } else if (video) {
            const videoResult = await uploadVideo(video, videoOptions);
            videoData.video = { publicId: videoResult.public_id, url: videoResult.url };
        }

        // Upload thumbnail
        if (req.files?.thumbnail) {
            const thumbnailResult = await uploadImage(req.files.thumbnail.tempFilePath, thumbnailOptions);
            videoData.thumbnail = { publicId: thumbnailResult.public_id, url: thumbnailResult.url };
            await fs.unlink(req.files.thumbnail.tempFilePath);
        } else if (thumbnail) {
            const thumbnailResult = await uploadImage(thumbnail, thumbnailOptions);
            videoData.thumbnail = { publicId: thumbnailResult.public_id, url: thumbnailResult.url };
        }

        // Create and save new video
        const newVideo = new Video({ ...videoObj, ...videoData });
        await newVideo.save();

        res.status(200).json({
            success: true,
            message: 'Video uploaded successfully!',
            video: newVideo,
        });
    } catch (error) {
        console.error(error);
        const errorResponse = {
            success: false,
            message: 'Error occurred while uploading the video',
        };

        if (error.name === 'ValidationError') {
            errorResponse.message = 'Validation Error';
            errorResponse.errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json(errorResponse);
        }

        if (error.code === 11000) {
            const field = Object.keys(error.keyValue);
            errorResponse.message = `Duplicate field value entered for ${field}: ${error.keyValue[field]}.`;
            return res.status(409).json(errorResponse);
        }

        res.status(500).json(errorResponse);
    }
};

exports.uploadVideoToMega = async (req, res) => {
    try {
        const videoFile = req.files.video;

        // Validate video file
        if (!videoFile) {
            return res.status(400).json({ success: false, message: 'No video file uploaded!' });
        }

        // Mega.nz credentials
        const { MEGA_EMAIL: email, MEGA_PASSWORD: password } = process.env;

        // Log in to Mega.nz
        const storage = new Mega({ email, password });

        // Wait for the storage to be ready
        await new Promise((resolve, reject) => {
            storage.on('ready', resolve);
            storage.on('error', reject);
        });

        console.log('Storage is ready, starting the upload...');

        // Create an upload stream
        const uploadStream = storage.upload({
            name: videoFile.name,
            size: videoFile.size,
            allowUploadBuffering: true
        });

        // Stream the file directly
        fs.createReadStream(videoFile.tempFilePath, { highWaterMark: 1024 * 1024 * 100 })
            .pipe(uploadStream)
            .on('error', (uploadError) => {
                console.error('Error uploading the video:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error occurred during the video upload.',
                    error: uploadError.message,
                });
            })
            .on('complete', async (file) => {
                try {
                    const publicLink = await file.link();
                    console.log('Public link:', publicLink);
                    return res.status(200).json({
                        success: true,
                        message: 'Video uploaded successfully!',
                        publicLink,
                    });
                } catch (linkError) {
                    console.error('Error generating public link:', linkError);
                    return res.status(500).json({
                        success: false,
                        message: 'Error occurred while generating the public link.',
                        error: linkError.message,
                    });
                }
            });

    } catch (error) {
        console.error('Error in uploadVideoToMega function:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while uploading the video.',
            error: error.message,
        });
    }
};

exports.getAllVideos = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 12, 1);
        const skip = (page - 1) * limit;

        const [videos, totalVideos] = await Promise.all([
            Video.find({}, { __v: 0 }).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Video.countDocuments(),
        ]);

        if (videos.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Videos not found",
            });
        }

        res.status(200).json({
            success: true,
            message: 'Videos fetched successfully...',
            totalVideos,
            totalPages: Math.ceil(totalVideos / limit),
            page,
            videos,
        });
    } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while fetching the videos',
        });
    }
};

exports.getAllVideosByCategory = async (req, res) => {
    try {
        const { category } = req.query;

        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Category is required',
            });
        }

        const videosByCategory = await Video.find({ category }, { __v: 0 });

        if (videosByCategory.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No videos found for this category',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Videos fetched successfully',
            videosByCategory,
        });
    } catch (error) {
        console.error('Error fetching videos by category:', error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while fetching videos',
        });
    }
};
