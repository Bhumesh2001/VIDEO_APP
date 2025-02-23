const { v4: uuidv4 } = require("uuid");
const busboy = require("busboy");
const Story = require('../../models/adminModel/story.adminModel');
const userModel = require('../../models/userModel/userModel');
const Admin = require('../../models/adminModel/adminModel');
const { deleteImageOnCloudinary, uploadImageOnCloudinary } = require('../../utils/uploadUtil');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');
const { validateFile } = require('../../utils/validateUtil');

exports.createStory = async (req, res, next) => {
    try {
        const bb = busboy({ headers: req.headers });

        let storyData = {
            userId: req.user._id,
            title: "",
            caption: "",
            image: { url: "", public_id: "" },
        };

        let fileUploadPromise = Promise.resolve(); // Default promise for file upload
        let isImageUploaded = false;

        // ✅ Extract form fields (title, caption)
        bb.on("field", (fieldname, value) => {
            if (fieldname === "title") {
                storyData.title = value || `Story-${uuidv4()}`;
            } else if (fieldname === "caption") {
                storyData.caption = value;
            }
        });

        // ✅ Handle file upload & validate before uploading
        bb.on("file", (fieldname, file, info) => {
            if (fieldname === "image") {
                isImageUploaded = true;
                
                // ✅ Validate file before uploading
                const validation = validateFile(info);
                if (!validation.valid) {
                    return res.status(400).json({ success: false, message: validation.message });
                }

                fileUploadPromise = uploadImageOnCloudinary(file, "VleStories").then((data) => {
                    storyData.image.url = data.secure_url;
                    storyData.image.public_id = data.public_id;
                });
            }
        });

        // ✅ After parsing form & file, validate required image
        bb.on("finish", async () => {
            try {
                if (!isImageUploaded) {
                    return res.status(400).json({ success: false, message: "Image is required!" });
                }

                await fileUploadPromise; // Ensure image upload is done

                // ✅ Check for existing story
                const existingStory = await Story.findOne({ title: storyData.title }).lean();
                if (existingStory) {
                    return res.status(409).json({
                        success: false,
                        message: "Story already exists!",
                    });
                }

                // ✅ Save to DB
                const story = await Story.create(storyData);

                // ✅ Clear Cache
                clearCache("node-cache");

                res.status(201).json({
                    success: true,
                    message: "Story created successfully",
                    story,
                });
            } catch (error) {
                next(error);
            }
        });

        req.pipe(bb);
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
    try {
        const { storyId } = req.query;

        // ✅ Check if story exists
        const existingStory = await Story.findOne({ _id: storyId, userId: req.user._id }).lean();
        if (!existingStory) {
            return res.status(404).json({ success: false, message: "Story not found!" });
        }

        const bb = busboy({ headers: req.headers });

        let updatedStoryData = {
            userId: req.user._id,
            title: existingStory.title,
            caption: existingStory.caption,
            image: { url: existingStory.image.url, public_id: existingStory.image.public_id },
        };

        let fileUploadPromise = Promise.resolve();
        let isImageUploaded = false;

        // ✅ Extract form fields (title, caption)
        bb.on("field", (fieldname, value) => {
            if (fieldname === "title") updatedStoryData.title = value;
            if (fieldname === "caption") updatedStoryData.caption = value;
        });

        // ✅ Handle file upload & validation
        bb.on("file", (fieldname, file, info) => {
            if (fieldname === "image") {
                isImageUploaded = true;

                // ✅ Validate file before uploading
                const validation = validateFile(info);
                if (!validation.valid) {
                    return res.status(400).json({ success: false, message: validation.message });
                }

                fileUploadPromise = (async () => {
                    // ✅ Delete old image if exists
                    if (existingStory.image.public_id) {
                        await deleteImageOnCloudinary(existingStory.image.public_id);
                    }

                    // ✅ Upload new image
                    const fileData = await uploadImageOnCloudinary(file, "VleStories");
                    updatedStoryData.image.url = fileData.secure_url;
                    updatedStoryData.image.public_id = fileData.public_id;
                })();
            }
        });

        // ✅ After parsing form & file, validate required image
        bb.on("finish", async () => {
            try {
                await fileUploadPromise; // Wait for file upload completion

                // ✅ Update story in DB
                const updatedStory = await Story.findOneAndUpdate(
                    { _id: storyId, userId: req.user._id },
                    updatedStoryData,
                    { new: true, runValidators: true }
                );

                // ✅ Clear cache
                clearCache("node-cache");

                res.status(200).json({
                    success: true,
                    message: "Story updated successfully!",
                    story: updatedStory,
                });
            } catch (error) {
                next(error);
            }
        });

        req.pipe(bb);
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
