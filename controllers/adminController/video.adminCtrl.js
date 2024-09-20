const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const Mega = require('megajs');

const Category = require('../../models/adminModel/category.adminModel');
const Video = require('../../models/adminModel/video.adminModel');

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

        const isCategoryAvailabel = await Category.findOne({ name: category }).exec();
        if (!isCategoryAvailabel) {
            return res.status(404).json({
                success: false,
                message: 'Category is not availabe!',
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
        if (existingVideo) {
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
                    folder: 'Videos',
                    resource_type: 'video',
                    chunk_size: 90000000,
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
                    folder: 'Videos',
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
                    folder: 'thumbnails',
                    resource_type: 'image',
                    transformation: [
                        { width: 1280, height: 720, crop: "fill" }
                    ]
                });

                videoData.video.publicId = thumbnailResult.public_id;
                videoData.video.url = thumbnailResult.secure_url;

                fs.unlinkSync(thumbnailFile.tempFilePath);

            } catch (error) {
                console.error('Error uploading thumbnail file:', error);
            };
        }
        else if (thumbnail) {
            try {
                const thumbnailResult = await cloudinary.uploader.upload(thumbnail, {
                    folder: 'thumbnails',
                    resource_type: 'image',
                    transformation: [
                        { width: 1280, height: 720, crop: "fill" }
                    ]
                });

                videoData.thumbnail.publicId = thumbnailResult.public_id;
                videoData.thumbnail.url = thumbnailResult.url;

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
