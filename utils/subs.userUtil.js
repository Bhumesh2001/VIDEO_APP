const cron = require('node-cron');
const UserSubscriptionModel = require('../models/userModel/subs.user.Model');

const checkSubscriptionsAndNotify = async () => {
    try {
        const userId = req.user._id;
        console.log(userId);
        
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 7);

        const expiringSubscriptions = await UserSubscriptionModel.find({
            userId,
            expiryDate: { $gte: today, $lt: futureDate }
        }).populate('categoryId');

        if (!expiringSubscriptions.length) {
            console.log({
                success: true,
                message: 'No expiring subscriptions found for the logged-in user.',
            });
        };

        const subscriptionsWithDaysLeft = expiringSubscriptions.map(subscription => {
            const daysLeft = Math.ceil((subscription.expiryDate - today) / (1000 * 60 * 60 * 24));
            return {
                category: subscription.categoryId.name,
                plan: subscription.plan,
                expiryDate: subscription.expiryDate,
                daysLeft,
            };
        });

        console.log({
            success: true,
            message: 'Found expiring subscriptions for the logged-in user.',
            subscriptions: subscriptionsWithDaysLeft,
        });

    } catch (error) {
        console.error('Error checking subscriptions:', error);
    };
};

cron.schedule('0 0 * * *', async () => {
    await checkSubscriptionsAndNotify();
});

exports.convertToMongooseDate = (dateString) => {
    const separator = dateString.includes('/') ? '/' : '-';

    const parts = dateString.split(separator);

    let day, month, year;

    if (parseInt(parts[0], 10) > 12) {
        day = parts[0];
        month = parts[1];
        year = parts[2];
    } else {
        month = parts[0];
        day = parts[1];
        year = parts[2];
    };

    const formattedDate = new Date(`${year}-${month}-${day}`);

    if (isNaN(formattedDate.getTime())) {
        throw new Error('Invalid date');
    };

    return formattedDate;
};
