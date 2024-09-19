const cron = require('node-cron');
const moment = require('moment');
const mongoose = require('mongoose');

const SingleCategorySubscriptionModel = require('../models/userModel/subs.user.Model');
const AllCategorySubscriptionModel = require('../models/userModel/allSubs.userModel');
const Category = require('../models/adminModel/category.adminModel');

// Cron job that runs every day at midnight
cron.schedule('0 0 * * *', async () => {
    const now = moment().toDate();  // Get the current date

    try {
        // Find and expire single-category subscriptions
        await SingleCategorySubscriptionModel.updateMany(
            { expiryDate: { $lt: now }, status: 'active' },
            { $set: { status: 'expired' } }
        );

        // Find and expire all-category subscriptions
        await AllCategorySubscriptionModel.updateMany(
            { expiryDate: { $lt: now }, status: 'active' },
            { $set: { status: 'expired' } }
        );

        console.log('Subscription expiration check completed successfully.');
    } catch (error) {
        console.error('Error updating subscription statuses:', error);
    };
});

// set the remidner for the user subescription 
const sendReminder = (subscription, userType) => {
    console.log(`Reminder: ${userType} subscription for user ${subscription.userId} is expiring on ${subscription.expiryDate}.`);
};

// Function to check and send reminders for expiring subscriptions
const sendExpiryReminder = async () => {
    const now = moment();
    const reminderDate = now.add(3, 'days').toDate();  // Remind 3 days before expiry

    try {
        // Find expiring single-category subscriptions
        const singleCategoryExpiring = await SingleCategorySubscriptionModel.find({
            expiryDate: { $lte: reminderDate, $gt: now.toDate() },
            status: 'active',
        });

        singleCategoryExpiring.forEach(subscription => {
            sendReminder(subscription, 'Single-category');
        });

        // Find expiring all-category subscriptions
        const allCategoryExpiring = await AllCategorySubscriptionModel.find({
            expiryDate: { $lte: reminderDate, $gt: now.toDate() },
            status: 'active',
        });

        allCategoryExpiring.forEach(subscription => {
            sendReminder(subscription, 'All-category');
        });

        console.log('Subscription reminders check completed successfully.');
    } catch (error) {
        console.error('Error checking expiring subscriptions:', error);
    };
};

// Schedule cron job to run daily at midnight
cron.schedule('0 0 * * *', sendExpiryReminder);

// convert the normal into the mongoose data
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

// fetch and return the userSubscription 
exports.UserSubscription = async (userId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid userId');
        };

        const [singleSubscription, allSubscription] = await Promise.all([
            SingleCategorySubscriptionModel.findOne({ userId }).select('categoryId').lean().exec(),
            AllCategorySubscriptionModel.findOne({ userId }).select('categoryId').lean().exec()
        ]);

        const userSubscription = singleSubscription || allSubscription;

        if (!userSubscription) {
            return null;
        }

        if (mongoose.Types.ObjectId.isValid(userSubscription.categoryId)) {
            const category = await Category.findById(userSubscription.categoryId).lean().exec();
            return category || { name: 'unknown' };
        } else {
            return { name: 'all' };
        }
    } catch (error) {
        console.error('Error in UserSubscription:', error);
        throw error;
    }
};

// is valid razorpay payment id or not
exports.isValidRazorpayOrderId = (orderId) => {
    const regex = /^order_[a-zA-Z0-9]{14}$/;
    return regex.test(orderId);
};
