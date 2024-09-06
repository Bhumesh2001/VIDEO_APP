const Story = require('../../models/adminModel/story.adminModel');
const { checkUrl } = require('../../utils/uploadImage');

exports.createStory = async (req, res) => {
    try {
        const { video, ...data} = req.body;

        if(!checkUrl(video)){
            return res.status(400).json({
                success: false,
                message: 'Invalid URL format',
            });
        };

        const storyData = {
            userId: req.user._id,
            video,
            ...data,
        };

        const story = new Story(storyData);
        await story.save();

        res.status(200).json({
            success: true,
            message: 'Story created successfully...',
            story,
        });

    } catch (error) {
        console.log(error);
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: validationErrors,
            });
        };
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'story already exists!',
            });
        };
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    };
};

exports.getAllStories = async (req, res) => {
    try {
        const stories = await Story.find({ userId: req.user._id });
        if (!stories) {
            return res.status(404).json({
                success: false,
                message: 'Stories not found!',
            });
        };
        res.status(200).json({
            success: true,
            message: 'Stories fetched successfully...',
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

        const story = await Story.findById(storyId);
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

exports.updateStory = async (req, res) => {
    try {
        const { storyId } = req.query;

        const story = await Story.findOneAndUpdate(
            { _id: storyId, userId: req.user._id },
            req.body,
            { new: true, runValidators: true, }
        );
        if (!story) {
            return res.status(404).json({
                success: true,
                message: 'story not found!',
            });
        };

        res.status(200).json({
            success: false,
            message: 'Story updated successfully...',
            story,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error occured during updating the story',
            error: error.message,
        });
    };
};

exports.deleteStory = async (req, res) => {
    try {
        const { storyId } = req.query || req.body;

        const story = await Story.findOneAndDelete({ userId: req.user._id, _id: storyId });
        if (!story) {
            return res.status(404).json({
                success: true,
                message: 'story not found!',
            });
        };

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