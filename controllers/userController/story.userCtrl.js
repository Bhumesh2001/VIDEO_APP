const fs = require('fs').promises;
const Story = require('../../models/adminModel/story.adminModel');
const { uploadImage, uploadVideo, deleteImageOnCloudinary } = require('../../utils/uploadUtil');

const storyVideoOptions = {
    folder: 'Stories',
};

const storyImageOptions = {
    folder: 'Stories',
    transformation: [
        { width: 1080, height: 720, crop: 'fill' }
    ]
};

exports.createStory = async (req, res) => {
    const { video, image, ...data } = req.body;

    const videoFile = req.files?.video;
    const imageFile = req.files?.image;

    let storyData = {
        userId: req.user._id,
        video: { url: '', public_id: '' },
        image: { url: '', public_id: '' },
        ...data
    };

    try {
        // Validate if image or imageFile exists
        if (!imageFile && !image) {
            return res.status(400).json({
                success: false,
                message: 'Either image file or image URL is required!',
            });
        };

        // Check if the story title already exists
        const existingStory = await Story.findOne({ title: data.title });
        if (existingStory) {
            return res.status(409).json({
                success: false,
                message: 'Story already exists!',
            });
        };

        // If video file exists, upload it to Cloudinary
        if (videoFile || video) {
            const videoInput = videoFile ? videoFile.tempFilePath : video;
            const videoResult = await uploadVideo(videoInput, storyVideoOptions);
            storyData.video.public_id = videoResult.public_id;
            storyData.video.url = videoResult.url;

            // Delete temp video file if uploaded from file
            if (videoFile) await fs.unlink(videoFile.tempFilePath);
        };

        if (imageFile || image) {
            const imageInput = imageFile ? imageFile.tempFilePath : image;
            const imageResult = await uploadImage(imageInput, storyImageOptions);
            storyData.image.public_id = imageResult.public_id;
            storyData.image.url = imageResult.url;

            // Delete temp image file if uploaded from file
            if (imageFile) await fs.unlink(imageFile.tempFilePath);
        };

        // Create and save the story in the database
        const story = new Story(storyData);
        await story.save();

        res.status(200).json({
            success: true,
            message: 'Story created successfully',
            story,
        });

    } catch (error) {
        console.error(error);

        if (storyData.image.public_id) deleteImageOnCloudinary(storyData.image.public_id);
        if (storyData.video.public_id) deleteImageOnCloudinary(storyData.video.public_id);

        // Validation error handling
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: validationErrors,
            });
        };

        // Server error handling
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    };
};

exports.getAllStories = async (req, res) => {
    try {
        const stories = await Story.aggregate([
            {
                $project: {
                    userId: 1,
                    title: 1,
                    vide: 1,
                    caption: 1,
                    views: 1,
                    likes: 1,
                    image: "$image.url",
                    TotalViews: { $size: "$views" },
                    TotalViews: { $size: "$likes" },
                    duration: 1,
                    expirationTime: 1,
                    createdAt: 1,
                }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]);
        const totalStories = await Story.countDocuments();
        if (stories.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Stories not found!',
            });
        };
        res.status(200).json({
            success: true,
            message: 'Stories fetched successfully...',
            totalStories,
            stories,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    };
};

exports.getSingleStory = async (req, res) => {
    try {
        const { storyId } = req.query;

        const story = await Story.findById(storyId).select(
            '_id title caption video.url image.url views likes duration status expirationTime'
        );
        if (!story) {
            return res.status(404).json({
                success: false,
                message: 'story not found',
            });
        };
        const plainStory = story.toObject();

        plainStory.video = plainStory.video.url;
        plainStory.image = plainStory.image.url;

        res.status(200).json({
            success: true,
            message: 'Story fetched successfully...',
            story: plainStory,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error occured during fetching the story',
            error: error.message,
        });
    };
};

exports.updateStory = async (req, res) => {
    const { storyId } = req.query;
    const { video, image, ...data } = req.body;

    const videoFile = req.files?.video;
    const imageFile = req.files?.image;

    let storyData = { ...data };

    try {
        // Fetch the story with the given ID and user ID
        const story_ = await Story.findOne({ _id: storyId, userId: req.user._id }).exec();
        if (!story_) {
            return res.status(404).json({
                success: false,
                message: 'Story not found!',
            });
        };

        // Helper function to handle file upload and cleanup
        const handleUpload = async (file, url, uploadFunc, currentFilePublicId, options) => {
            if (file || url) {
                // Delete the old file from Cloudinary if a new one is provided
                if (currentFilePublicId) await deleteImageOnCloudinary(currentFilePublicId);

                const input = file ? file.tempFilePath : url;
                const result = await uploadFunc(input, options);

                if (file) await fs.unlink(file.tempFilePath); // Delete the temp file asynchronously

                return {
                    url: result.url,
                    public_id: result.public_id
                };
            }
            return null;
        };

        // Handle video upload if provided
        const newVideoData = await handleUpload(videoFile, video, uploadVideo, story_.video.public_id, storyVideoOptions);
        if (newVideoData) storyData.video = newVideoData;

        // Handle image upload if provided
        const newImageData = await handleUpload(imageFile, image, uploadImage, story_.image.public_id, storyImageOptions);
        if (newImageData) storyData.image = newImageData;

        // Update the story with the new data
        const updatedStory = await Story.findOneAndUpdate(
            { _id: storyId, userId: req.user._id },
            storyData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Story updated successfully...',
            story: updatedStory,
        });

    } catch (error) {
        console.error(error);

        // Cleanup uploaded files in case of error
        const deleteFileIfExists = async (publicId) => {
            if (publicId) await deleteImageOnCloudinary(publicId);
        };

        if (storyData.image?.public_id) await deleteFileIfExists(storyData.image.public_id);
        if (storyData.video?.public_id) await deleteFileIfExists(storyData.video.public_id);

        res.status(500).json({
            success: false,
            message: 'Error occurred during updating the story',
            error: error.message,
        });
    }
};

exports.deleteStory = async (req, res) => {
    try {
        const { storyId } = req.query;

        const story = await Story.findOneAndDelete({ userId: req.user._id, _id: storyId });
        if (!story) {
            return res.status(404).json({
                success: true,
                message: 'story not found!',
            });
        };

        if (story.image.public_id) await deleteImageOnCloudinary(story.image.public_id);
        if (story.video.public_id) await deleteImageOnCloudinary(story.video.public_id);

        res.status(200).json({
            success: false,
            message: 'Story deleted successfully...',
            story,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error occured during deletng the story',
            error: error.message,
        });
    };
};