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
    // Determine the date separator used
    const separator = dateString.includes('/') ? '/' : '-';
    const parts = dateString.split(separator);

    if (parts.length !== 3) {
        throw new Error('Invalid date format');
    }

    let [first, second, third] = parts.map(part => part.trim());

    // Determine if the first part is a day or month
    let day, month, year;
    if (parseInt(first, 10) > 12) {
        // Format is DD/MM/YYYY or DD-MM-YYYY
        day = first;
        month = second;
        year = third;
    } else {
        // Format is MM/DD/YYYY or MM-DD-YYYY
        month = first;
        day = second;
        year = third;
    }

    // Create a date string in the format YYYY-MM-DD
    const formattedDateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const formattedDate = new Date(formattedDateString);

    // Check if the date is valid
    if (isNaN(formattedDate.getTime())) {
        throw new Error('Invalid date');
    }

    return formattedDate;
};
