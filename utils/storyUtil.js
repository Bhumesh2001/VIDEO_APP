const cron = require('node-cron');
const Story = require('../models/adminModel/story.adminModel');

cron.schedule('0 * * * *', async () => {
    try {
        const now = new Date();
        await Story.deleteMany({ expirationTime: { $lt: now } });
    } catch (err) {
        console.error('Error deleting expired stories:', err);
    };
});
