const cloudinary = require('cloudinary').v2;
const Video = require('../../models/adminModel/video.adminModel');
const fs = require('fs');

// ------------- upload video -----------------

exports.uploadVideoToCloudinary = async (req, res) => {
    try {
        const { title, description, category, video, thumbnail } = req.body;

        const videoFile = req.files?.video;
        const thumbnailFile = req.files?.thumbnail;

        if (!title || !description || !category || (!video && !videoFile) ||
            (!thumbnail && !thumbnailFile)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, category, video, and thumbnail are required.',
            });
        };

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

        const existingVideo = await Video.findOne({ title });
        if(existingVideo){
            return res.status(409).json({
                success: false,
                message: 'Video already eixists!',
            });
        };

        const tempVideo = new Video(videoObj);

        const validationError = tempVideo.validateSync();
        if (validationError) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: Object.values(validationError.errors).map(err => err.message),
            });
        };

        if (videoFile) {
            try {
                const videoResult = await cloudinary.uploader.upload(videoFile.tempFilePath, {
                    resource_type: 'video',
                    chunk_size: 6000000,
                });

                videoData.video.publicId = videoResult.public_id;
                videoData.video.url = videoResult.secure_url;

                fs.unlinkSync(videoFile.tempFilePath);

            } catch (error) {
                console.error('Error uploading video file:', error);
            };
        }
        else if (video) {
            try {
                const videoResult = await cloudinary.uploader.upload(video, {
                    resource_type: 'video',
                });

                videoData.video.publicId = videoResult.public_id;
                videoData.video.url = videoResult.secure_url;

            } catch (error) {
                console.error('Error uploading video URL:', error);
            };
        };

        if (thumbnailFile) {
            try {
                const thumbnailResult = await cloudinary.uploader.upload(thumbnailFile.tempFilePath, {
                    resource_type: 'image',
                });

                videoData.thumbnail.publicId = thumbnailResult.public_id;
                videoData.thumbnail.url = thumbnailResult.secure_url;

                fs.unlinkSync(thumbnailFile.tempFilePath);

            } catch (error) {
                console.error('Error uploading thumbnail file:', error);
            };
        }
        else if (thumbnail) {
            try {
                const thumbnailResult = await cloudinary.uploader.upload(thumbnail, {
                    resource_type: 'image',
                });

                videoData.thumbnail.publicId = thumbnailResult.public_id;
                videoData.thumbnail.url = thumbnailResult.secure_url;

            } catch (error) {
                console.error('Error uploading thumbnail URL:', error);
            };
        };

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
        };

        if (error.code === 11000) {
            const field = Object.keys(error.keyValue);
            return res.status(409).json({
                success: false,
                message: `Duplicate field value entered for ${field}: ${error.keyValue[field]}.`,
            });
        };

        res.status(500).json({
            success: false,
            message: 'Error occurred while uploading the video',
            error,
        });
    };
};

exports.getAllvideos = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;

        const skip = (page - 1) * limit;

        const videos = await Video.find({}, { __v: 0 }).skip(skip).limit(limit);
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
            videos,
            totalVideos,
            page,
            totalPages: Math.ceil(totalVideos / limit),
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
