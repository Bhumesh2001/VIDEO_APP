const cron = require('node-cron');
const Story = require('../models/adminModel/story.adminModel');

cron.schedule('30 * * * *', async () => {
    try {
        const now = new Date();
        const result = await Story.updateMany(
            { expirationTime: { $lt: now }, status: 'active' },
            { $set: { status: 'expired' } }
        );
        console.log(`${result.nModified} stories have been marked as expired`);
    } catch (err) {
        console.error('Error updating expired stories:', err);
    }
});

cron.schedule('0 0 * * *', async () => {
    try {
        const now = new Date();
        await Story.deleteMany({ expirationTime: { $lt: now } });
        console.log('Expired stories deleted successfully');
    } catch (err) {
        console.error('Error deleting expired stories:', err);
    };
});
