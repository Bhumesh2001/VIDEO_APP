const { faker } = require('@faker-js/faker');
const busboy = require("busboy");
const Story = require('../../models/adminModel/story.adminModel');
const { deleteImageOnCloudinary, uploadImageOnCloudinary } = require('../../utils/uploadUtil');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');

exports.createStoryByAdmin = async (req, res, next) => {
    try {
        const bb = busboy({ headers: req.headers });

        let storyData = {
            userId: req.admin._id,
            title: "",
            caption: "",
            image: { url: "", public_id: "" },
        };

        let imageFile = null;

        // Parse form fields
        bb.on("field", (name, value) => {
            if (name === "title") {
                storyData.title = value;
            } else if (name === "caption") {
                storyData.caption = value;
            } else {
                storyData[name] = value;
            }
        });

        // Handle file uploads
        let fileUploadPromise = new Promise((resolve, reject) => {
            let fileProcessed = false;

            bb.on("file", async (name, file, info) => {
                try {
                    if (name === "image") {
                        fileProcessed = true;
                        const data = await uploadImageOnCloudinary(file, "VleStories");
                        storyData.image.url = data.secure_url;
                        storyData.image.public_id = data.public_id;
                    }
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });

            bb.on("finish", () => {
                if (!fileProcessed) resolve(); // Resolve if no file was uploaded
            });

            req.pipe(bb);
        });

        await fileUploadPromise; // Wait for file upload to complete

        // Set default title if missing
        storyData.title = storyData.title || faker.lorem.sentence();

        // Check for existing story
        const existingStory = await Story.findOne({ title: storyData.title }).lean();
        if (existingStory) {
            return res.status(409).json({ success: false, status: 409, message: "Story already exists!" });
        }

        // Save the story
        const story = new Story(storyData);
        await story.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: "Story created successfully!",
            story,
        });

    } catch (error) {
        next(error);
    }
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
    try {
        const { storyId } = req.query;
        if (!storyId) {
            return res.status(400).json({ success: false, status: 400, message: "Story ID is required!" });
        }

        // Fetch existing story
        const existingStory = await Story.findById(storyId);
        if (!existingStory) {
            return res.status(404).json({ success: false, status: 404, message: "Story not found!" });
        }

        const bb = busboy({ headers: req.headers });

        let updatedData = {
            title: existingStory.title,
            caption: existingStory.caption,
            image: { url: existingStory.image.url, public_id: existingStory.image.public_id },
        };

        let fileUploadPromise = new Promise((resolve, reject) => {
            let fileProcessed = false;

            bb.on("field", (name, value) => {
                if (name === "title") updatedData.title = value;
                else if (name === "caption") updatedData.caption = value;
            });

            bb.on("file", async (name, file, info) => {
                try {
                    if (name === "image") {
                        fileProcessed = true;

                        // Delete old image if exists
                        if (existingStory.image.public_id) {
                            await deleteImageOnCloudinary(existingStory.image.public_id);
                        }

                        // Upload new image
                        const data = await uploadImageOnCloudinary(file, "VleStories");
                        updatedData.image.url = data.secure_url;
                        updatedData.image.public_id = data.public_id;
                    }
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });

            bb.on("finish", () => {
                if (!fileProcessed) resolve(); // Resolve if no file was uploaded
            });

            req.pipe(bb);
        });

        await fileUploadPromise; // Wait for file upload completion

        // Update story in DB
        const updatedStory = await Story.findByIdAndUpdate(storyId, updatedData, {
            new: true,
            runValidators: true,
        });

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: "Story updated successfully!",
            story: updatedStory,
        });

    } catch (error) {
        next(error);
    }
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
