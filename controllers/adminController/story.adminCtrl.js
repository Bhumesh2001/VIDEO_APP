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
    const { video, image, title, ...data } = req.body;
    const videoFile = req.files?.video;
    const imageFile = req.files?.image;

    if (!imageFile && !image) {
        return res.status(400).json({ success: false, message: 'Either image file or image URL is required!' });
    }

    try {
        // Check for existing story
        const existingStory = await Story.findOne({ title }).exec();
        if (existingStory) {
            return res.status(409).json({ success: false, message: 'Story already exists!' });
        }

        const storyData = {
            userId: req.admin._id,
            video: { url: '', public_id: '' },
            image: { url: '', public_id: '' },
            ...data
        };

        // Upload video
        if (videoFile || video) {
            const videoInput = videoFile ? videoFile.tempFilePath : video;
            const { public_id, url } = await uploadVideo(videoInput, storyVideoOptions);
            storyData.video = { public_id, url };

            if (videoFile) await fs.unlink(videoFile.tempFilePath);
        }

        // Upload image
        if (imageFile || image) {
            const imageInput = imageFile ? imageFile.tempFilePath : image;
            const { public_id, url } = await uploadImage(imageInput, storyImageOptions);
            storyData.image = { public_id, url };

            if (imageFile) await fs.unlink(imageFile.tempFilePath);
        }

        // Save the story
        const story = new Story(storyData);
        await story.save();

        res.status(200).json({ success: true, message: 'Story created successfully!', story });

    } catch (error) {
        console.error('Error:', error);

        // Clean up uploaded resources if needed
        if (storyData.video.public_id) await deleteImageOnCloudinary(storyData.video.public_id);
        if (storyData.image.public_id) await deleteImageOnCloudinary(storyData.image.public_id);

        const errorMessage = error.name === 'ValidationError'
            ? Object.values(error.errors).map(err => err.message).join(', ')
            : 'Server Error';

        res.status(500).json({ success: false, message: errorMessage });
    }
};

exports.getAllStoriesByAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const [stories, totalStories] = await Promise.all([
            Story.find({})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Story.countDocuments()
        ]);

        if (stories.length === 0) {
            return res.status(404).json({ success: false, message: 'No stories found!' });
        }

        res.status(200).json({
            success: true,
            message: 'Stories fetched successfully...',
            totalStories,
            totalPages: Math.ceil(totalStories / limit),
            page,
            stories,
        });
    } catch (error) {
        console.error('Error fetching stories:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
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
    const videoFile = req.files?.video;
    const imageFile = req.files?.image;

    try {
        const story = await Story.findById(storyId);
        if (!story) {
            return res.status(404).json({ success: false, message: "Story not found!" });
        }

        const storyData = { ...data };

        // Handle video upload
        if (videoFile || video) {
            if (story.video.public_id) await deleteImageOnCloudinary(story.video.public_id);
            const videoInput = videoFile?.tempFilePath || video;
            const videoResult = await uploadVideo(videoInput, storyVideoOptions);
            storyData.video = { public_id: videoResult.public_id, url: videoResult.url };
            if (videoFile) await fs.unlink(videoFile.tempFilePath);
        } else {
            // Keep existing video data if no new video is provided
            storyData.video = { public_id: story.video.public_id, url: story.video.url };
        }

        // Handle image upload
        if (imageFile || image) {
            if (story.image.public_id) await deleteImageOnCloudinary(story.image.public_id);
            const imageInput = imageFile?.tempFilePath || image;
            const imageResult = await uploadImage(imageInput, storyImageOptions);
            storyData.image = { public_id: imageResult.public_id, url: imageResult.url };
            if (imageFile) await fs.unlink(imageFile.tempFilePath);
        } else {
            // Keep existing image data if no new image is provided
            storyData.image = { public_id: story.image.public_id, url: story.image.url };
        }

        const updatedStory = await Story.findByIdAndUpdate(storyId, storyData, { new: true, runValidators: true });

        res.status(200).json({
            success: true,
            message: 'Story updated successfully...',
            story: updatedStory,
        });
    } catch (error) {
        console.error('Error updating story:', error);
        res.status(500).json({ success: false, message: 'Error occurred while updating the story', error: error.message });
    }
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