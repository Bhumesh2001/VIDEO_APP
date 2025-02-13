const { faker } = require('@faker-js/faker');
const Story = require('../../models/adminModel/story.adminModel');
const { deleteImageOnCloudinary, uploadImageOnCloudinary } = require('../../utils/uploadUtil');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');

exports.createStoryByAdmin = async (req, res, next) => {
    let { image, title, caption, ...data } = req.body;

    let storyData = {
        userId: req.admin._id,
        title: title ? title : faker.lorem.sentence(),
        caption: caption,
        image: { url: '', public_id: '' },
        ...data
    };

    try {
        // Check for existing story
        const existingStory = await Story.findOne({ title }).lean();
        if (existingStory) {
            return res.status(409).json({ success: false, status: 409, message: 'Story already exists!' });
        }

        // Upload image
        if (req.file) {
            const data = await uploadImageOnCloudinary(req.file.path, 'VleStories');
            storyData.image.url = data.secure_url;
            storyData.image.public_id = data.public_id;
        }

        // Save the story
        const story = new Story(storyData);
        await story.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Story created successfully!',
            story
        });
    } catch (error) {
        next(error);
    };
};

exports.getAllStoriesByAdmin = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const [stories, totalStories] = await Promise.all([
            Story.find({}, { createdAt: 0, updatedAt: 0, __v: 0, public_id: 0 })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Story.countDocuments()
        ]);

        if (stories.length === 0) {
            return res.status(404).json({ success: false, status: 404, message: 'No stories found!' });
        }

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Stories fetched successfully...',
            totalStories,
            totalPages: Math.ceil(totalStories / limit),
            page,
            stories,
        });
    } catch (error) {
        next(error);
    };
};

exports.getSingleStoryByAdmin = async (req, res, next) => {
    try {
        const { storyId } = req.query;
        const story = await Story.findById(storyId)
            .select('-createdAt -updatedAt -__v -public_id')
            .lean();
        if (!story) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: 'Story not found!',
            });
        };

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Story fetched successfully...',
            story,
        });
    } catch (error) {
        next(error);
    };
};

exports.updateStoryByAdmin = async (req, res, next) => {
    const { storyId } = req.query;
    const { title, caption } = req.body;

    let storyData = {
        userId: req.admin._id,
        title,
        caption,
        image: { url: '', public_id: '' },
    };

    try {
        const story = await Story.findById(storyId).lean();
        if (!story) {
            return res.status(404).json({ success: false, status: 404, message: "Story not found!" });
        };

        // Handle image upload
        if (req.file) {
            if (story.image.public_id) await deleteImageOnCloudinary(story.image.public_id);
            const data = await uploadImageOnCloudinary(req.file.path, 'VleStories');
            storyData.image.url = data.secure_url;
            storyData.image.public_id = data.public_id;
        } else {
            storyData.image = { public_id: story.image.public_id, url: story.image.url };
        }

        const updatedStory = await Story.findByIdAndUpdate(
            storyId,
            storyData,
            { new: true, runValidators: true }
        );

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Story updated successfully...',
            story: updatedStory,
        });
    } catch (error) {
        next(error);
    };
};

exports.deleteStoryByAdmin = async (req, res, next) => {
    try {
        const { storyId } = req.query;
        const story = await Story.findByIdAndDelete(storyId);
        if (!story) {
            return res.status(404).json({
                success: true,
                status: 404,
                message: 'story not found!',
            });
        };

        if (story.image.public_id) await deleteImageOnCloudinary(story.image.public_id);

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: false,
            status: 200,
            message: 'Story deleted successfully...',
            story,
        });
    } catch (error) {
        next(error);
    };
};
