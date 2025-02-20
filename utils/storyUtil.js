const cron = require("node-cron");
const Story = require("../models/adminModel/story.adminModel");
const { deleteImageOnCloudinary } = require("../utils/uploadUtil");

cron.schedule("0 * * * *", async () => {
    try {
        const now = new Date();

        // Fetch expired stories to get their image public IDs
        const expiredStories = await Story.find({ expirationTime: { $lt: now } });
        if (expiredStories.length === 0) return; // No expired stories, exit

        // Extract image public IDs
        const publicIds = expiredStories
            .map((story) => story.image.public_id) // Assuming public ID is stored in `imagePublicId`
            .filter(Boolean); // Remove undefined/null values

        // Delete images from Cloudinary
        if (publicIds.length > 0) {
            await Promise.all(publicIds.map((id) => deleteImageOnCloudinary(id)));
        }

        // Delete stories from the database
        await Story.deleteMany({ expirationTime: { $lt: now } });
    } catch (err) {
        console.error("Error deleting expired stories:", err.message);
    }
});
