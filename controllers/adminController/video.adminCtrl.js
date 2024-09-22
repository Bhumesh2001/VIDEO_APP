const fs = require('fs');
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

        if (!title || !description || !category || (!video && !req.files?.video) || (!thumbnail && !req.files?.thumbnail)) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, category, video, and thumbnail are required.',
            });
        }

        const isCategoryAvailable = await Category.findOne({ name: category }).exec();
        if (!isCategoryAvailable) {
            return res.status(404).json({
                success: false,
                message: 'Category is not available!',
            });
        }

        let videoObj = {
            title,
            description,
            category,
        };

        let videoData = {
            video: {
                publicId: '',
                url: '',
            },
            thumbnail: {
                publicId: '',
                url: '',
            },
        };

        const existingVideo = await Video.findOne({ title }).exec();
        if (existingVideo) {
            return res.status(409).json({
                success: false,
                message: 'Video already exists!',
            });
        }

        const tempVideo = new Video(videoObj);
        const validationError = tempVideo.validateSync();
        if (validationError) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: Object.values(validationError.errors).map(err => err.message),
            });
        }

        if (req.files?.video) {
            const videoResult = await uploadVideo(req.files.video.tempFilePath, videoOptions);
            videoData.video.publicId = videoResult.public_id;
            videoData.video.url = videoResult.url;
            fs.unlinkSync(req.files.video.tempFilePath);
        } else if (video) {
            const videoResult = await uploadVideo(video, videoOptions);
            videoData.video.publicId = videoResult.public_id;
            videoData.video.url = videoResult.url;
        }

        if (req.files?.thumbnail) {
            const thumbnailResult = await uploadImage(req.files.thumbnail.tempFilePath, thumbnailOptions);
            videoData.thumbnail.publicId = thumbnailResult.public_id;
            videoData.thumbnail.url = thumbnailResult.url;
            fs.unlinkSync(req.files.thumbnail.tempFilePath);
        } else if (thumbnail) {
            const thumbnailResult = await uploadImage(thumbnail, thumbnailOptions);
            videoData.thumbnail.publicId = thumbnailResult.public_id;
            videoData.thumbnail.url = thumbnailResult.url;
        }

        const newVideo = new Video({
            ...videoObj,
            ...videoData,
        });
        await newVideo.save();

        res.status(200).json({
            success: true,
            message: 'Video uploaded successfully!',
            video: newVideo,
        });
    } catch (error) {
        console.error(error);
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: validationErrors,
            });
        }
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue);
            return res.status(409).json({
                success: false,
                message: `Duplicate field value entered for ${field}: ${error.keyValue[field]}.`,
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error occurred while uploading the video',
            error,
        });
    }
};

exports.uploadVideoToMega = async (req, res) => {
    try {
        const videoFile = req.files.video;

        if (!videoFile) {
            return res.status(400).json({
                success: false,
                message: 'No video file uploaded!',
            });
        };

        // Mega.nz credentials
        const email = process.env.MEGA_EMAIL;
        const password = process.env.MEGA_PASSWORD;

        // Log in to Mega.nz
        const storage = new Mega({
            email: email,
            password: password
        });

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

        // Use fs.createReadStream to stream the file directly
        const fileStream = fs.createReadStream(videoFile.tempFilePath, {
            highWaterMark: 1024 * 1024 * 90 // Adjust chunk size as needed (e.g., 10MB)
        });
        fileStream.pipe(uploadStream);

        // Handle upload complete event
        uploadStream.on('complete', async (file) => {
            try {
                // Generate the public link
                const publicLink = await file.link();
                console.log('Public link:', publicLink);

                // Send success response with the public link
                return res.status(200).json({
                    success: true,
                    message: 'Video uploaded successfully!',
                    publicLink: publicLink,
                });
            } catch (linkError) {
                console.error('Error generating public link:', linkError);
                return res.status(500).json({
                    success: false,
                    message: 'Error occurred while generating the public link.',
                    error: linkError.message,
                });
            };
        });

        // Handle errors during upload
        uploadStream.on('error', (uploadError) => {
            console.error('Error uploading the video:', uploadError);
            return res.status(500).json({
                success: false,
                message: 'Error occurred during the video upload.',
                error: uploadError.message,
            });
        });

    } catch (error) {
        console.error('Error in uploadVideoToMega function:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while uploading the video.',
            error: error.message,
        });
    };
};

exports.getAllvideos = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;

        const skip = (page - 1) * limit;

        const videos = await Video.find({}, { __v: 0 }).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const totalVideos = await Video.countDocuments();

        if (videos.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Videos not found",
            });
        };
        res.status(200).json({
            success: true,
            message: 'Video fetched successfully...',
            totalVideos,
            totalPages: Math.ceil(totalVideos / limit),
            page,
            videos,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'error occured while fetching the video',
        });
    };
};

exports.getAllvideosByCategory = async (req, res) => {
    try {
        const { category } = req.query;

        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'category is required',
            });
        };
        const videosByCategory = await Video.find({ category }, { __v: 0 });
        if (videosByCategory.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Videos Not Found',
            });
        };
        res.status(200).json({
            success: true,
            message: 'Videos fetched successfully...',
            videosByCategory,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'error occured while fetching the video',
        });
    };
};
