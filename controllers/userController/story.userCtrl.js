const { v4: uuidv4 } = require("uuid");
const Story = require('../../models/adminModel/story.adminModel');
const userModel = require('../../models/userModel/userModel');
const Admin = require('../../models/adminModel/adminModel');
const { deleteImageOnCloudinary, uploadImageOnCloudinary } = require('../../utils/uploadUtil');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');

exports.createStory = async (req, res, next) => {
    try {
        const { title, caption } = req.body;

        // Generate unique title if not provided
        const storyTitle = title ? title : `Story-${uuidv4()}`;

        // Check if the story title already exists
        const existingStory = await Story.findOne({ title: storyTitle }).lean().exec();
        if (existingStory) {
            return res.status(409).json({
                success: false,
                message: "Story already exists!",
            });
        }

        // Prepare story data
        let storyData = {
            userId: req.user._id,
            title: storyTitle,
            caption,
            image: { url: "", public_id: "" },
        };

        // Upload file if provided
        if (req.file) {
            const fileData = await uploadImageOnCloudinary(req.file.path, "VleStories");
            storyData.image.url = fileData.secure_url;
            storyData.image.public_id = fileData.public_id;
        }

        // Create and save the story
        const story = await Story.create(storyData);

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            message: "Story created successfully",
            story,
        });

    } catch (error) {
        next(error);
    }
};

exports.getAllStories = async (req, res, next) => {
    try {
        // Fetch all stories
        const stories = await Story.find()
            .sort({ createdAt: -1 })
            .select('_id userId title video caption views likes image createdAt expirationTime')
            .lean();

        if (!stories.length) {
            return res.status(404).json({
                success: false,
                message: 'Stories not found!',
            });
        }

        // Fetch corresponding usernames for each story
        const storyPromises = stories.map(async (story) => {

            const user = await userModel.findById(story.userId).select('username').lean();
            const admin = await Admin.findById(story.userId).select('username').lean();
            const User = user || admin;

            return {
                _id: story._id,
                userId: story.userId,
                username: User ? User.username : 'Unknown',
                title: story.title,
                video: story.video?.url || '',
                caption: story.caption,
                views: story.views?.length || 0,
                likes: story.likes?.length || 0,
                image: story.image?.url || '',
                createdAt: story.createdAt,
                expirationTime: story.expirationTime,
            };
        });

        // Resolve all the promises for user data
        const storiesWithUsernames = await Promise.all(storyPromises);

        // Send the transformed stories as a response
        res.status(200).json({
            success: true,
            message: 'Stories fetched successfully...',
            stories: storiesWithUsernames,
        });
    } catch (error) {
        next(error);
    }
};

exports.getSingleStory = async (req, res, next) => {
    try {
        const { storyId } = req.query; // ✅ Use req.params instead of req.query

        if (!storyId) {
            return res.status(400).json({ success: false, message: "storyId is required" });
        }

        const story = await Story.findById(storyId).select(
            "_id userId title caption image.url views likes duration status expirationTime"
        ).lean(); // ✅ No need for .toObject()

        if (!story) {
            return res.status(404).json({
                success: false,
                message: "Story not found!",
            });
        }

        // ✅ Handle potential undefined `image.url`
        story.image = story.image?.url || null;

        res.status(200).json({
            success: true,
            message: "Story fetched successfully...",
            story,
        });

    } catch (error) {
        next(error);
    }
};

exports.updateStory = async (req, res, next) => {
    const { storyId } = req.query;
    const { title, caption } = req.body;

    let storyData = {
        userId: req.user._id,
        image: { url: '', public_id: '' },
        title,
        caption,
    };

    try {
        // Fetch the story with the given ID and user ID
        const story_ = await Story.findOne({ _id: storyId, userId: req.user._id }).lean().exec();
        if (!story_) {
            return res.status(404).json({
                success: false,
                message: 'Story not found!',
            });
        };

        storyData.image.url = story_.image.url;
        storyData.image.public_id = story_.image.public_id;

        if (req.file) {
            if (story_.image.public_id) await deleteImageOnCloudinary(story_.image.public_id);
            const data = await uploadImageOnCloudinary(req.file.path, 'VleStories');
            storyData.image.url = data.secure_url;
            storyData.image.public_id = data.public_id;
        };

        // Update the story with the new data
        const updatedStory = await Story.findOneAndUpdate(
            { _id: storyId, userId: req.user._id },
            storyData,
            { new: true, runValidators: true }
        );

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            message: 'Story updated successfully...',
            story: updatedStory,
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteStory = async (req, res, next) => {
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

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: false,
            message: 'Story deleted successfully...',
            story,
        });
    } catch (error) {
        next(error);
    };
};
