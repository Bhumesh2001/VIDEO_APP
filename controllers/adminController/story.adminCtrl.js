const fs = require('fs').promises;
const Story = require('../../models/adminModel/story.adminModel');
const { deleteImageOnCloudinary } = require('../../utils/uploadImage');
const { uploadImage, uploadVideo } = require('../../utils/uploadUtil');

const storyVideoOptions = {
    folder: 'Stories',
};
const storyImageOptions = {
    folder: 'Stories',
    transformation: [
        { width: 1080, height: 720, crop: 'fill' }
    ]
};

exports.createStoryByAdmin = async (req, res) => {
    const { video, image, ...data } = req.body;

    const videoFile = req.files?.video;
    const imageFile = req.files?.image;

    let storyData = {
        userId: req.admin._id,
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

        // Check if story with the same title exists
        const existingStory = await Story.findOne({ title: data.title }).exec();
        if (existingStory) {
            return res.status(409).json({
                success: false,
                message: 'Story already exists!',
            });
        };

        // Video upload logic
        if (videoFile || video) {
            const videoInput = videoFile ? videoFile.tempFilePath : video;
            const videoResult = await uploadVideo(videoInput, storyVideoOptions);
            storyData.video.public_id = videoResult.public_id;
            storyData.video.url = videoResult.url;

            // Delete temp video file if uploaded from file
            if (videoFile) await fs.unlink(videoFile.tempFilePath);
        };

        // Image upload logic
        if (imageFile || image) {
            const imageInput = imageFile ? imageFile.tempFilePath : image;
            const imageResult = await uploadImage(imageInput, storyImageOptions);
            storyData.image.public_id = imageResult.public_id;
            storyData.image.url = imageResult.url;

            // Delete temp image file if uploaded from file
            if (imageFile) await fs.unlink(imageFile.tempFilePath);
        };

        // Save the story in the database
        const story = new Story(storyData);
        await story.save();

        res.status(200).json({
            success: true,
            message: 'Story created successfully!',
            story,
        });

    } catch (error) {
        console.error('Error:', error);

        // Clean up resources in case of failure
        if (storyData.video.public_id) await deleteImageOnCloudinary(storyData.video.public_id);
        if (storyData.image.public_id) await deleteImageOnCloudinary(storyData.image.public_id);

        const errorMessage = error.name === 'ValidationError'
            ? Object.values(error.errors).map(err => err.message)
            : error.message;

        return res.status(500).json({
            success: false,
            message: errorMessage || 'Server Error',
        });
    }
};

exports.getAllStoriesByAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;

        const skip = (page - 1) * limit;

        const stories = await Story.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalStories = await Story.countDocuments();

        if (!stories) {
            return res.status(404).json({
                success: false,
                message: 'Stories not found!',
            });
        };
        res.status(200).json({
            success: true,
            message: 'Stories fetched successfully...',
            totalStories,
            totalPages: Math.ceil(totalStories / limit),
            page,
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

exports.getSingleStoryByAdmin = async (req, res) => {
    try {
        const { storyId } = req.query;

        const story = await Story.findById(storyId).exec();
        if (!story) {
            return res.status(404).json({
                success: false,
                message: 'story not found',
            });
        };

        res.status(200).json({
            success: true,
            message: 'Story fetched successfully...',
            story,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error occured during fetching the story',
            error: error.message,
        });
    };
};

exports.updateStoryByAdmin = async (req, res) => {
    const { storyId } = req.query;
    const { video, image, ...data } = req.body;

    const videoFile = req.files.video;
    const imageFile = req.files.image;

    let storyData = {
        video: { url: '', public_id: '' },
        image: { url: '', public_id: '' },
        ...data
    };

    try {
        const story_ = await Story.findOne({ _id: storyId, userId: req.admin._id });
        if (!story_) {
            return res.status(404).json({
                success: false,
                message: "Story not found!",
            });
        };

        if (videoFile || video) {
            if (story_.video.public_id) deleteImageOnCloudinary(story_.video.public_id);
            const videoInput = videoFile.tempFilePath ? videoFile.tempFilePath : video;
            const videoResult = await uploadVideo(videoInput, storyVideoOptions);

            storyData.video.public_id = videoResult.public_id;
            storyData.video.url = videoResult.url;

            if (videoFile) await fs.unlink(videoFile.tempFilePath);
        };

        if (imageFile || image) {
            if (story_.image.public_id) deleteImageOnCloudinary(story_.image.public_id);

            const imageInput = imageFile.tempFilePath ? imageFile.tempFilePath : image;
            const imageResult = await uploadImage(imageInput, storyImageOptions);

            storyData.image.public_id = imageResult.public_id
            storyData.image.url = imageResult.url;

            if (imageFile) await fs.unlink(imageFile.tempFilePath);
        };

        const story = await Story.findOneAndUpdate(
            { _id: storyId, userId: req.admin._id },
            storyData,
            { new: true, runValidators: true, }
        );

        res.status(200).json({
            success: false,
            message: 'Story updated successfully...',
            story,
        });

    } catch (error) {
        console.log(error);

        const deleteFileIfExists = (file, publicId) => {
            if (file && publicId) {
                deleteImageOnCloudinary(publicId);
            };
        };
        deleteFileIfExists(imageFile, storyData.video.public_id);
        deleteFileIfExists(videoFile, storyData.image.public_id);

        res.status(500).json({
            success: false,
            message: 'Error occured during updating the story',
            error: error.message,
        });
    };
};

exports.deleteStoryByAdmin = async (req, res) => {
    try {
        const { storyId } = req.query;

        const story = await Story.findByIdAndDelete(storyId);
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