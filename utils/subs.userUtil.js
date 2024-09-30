const cron = require('node-cron');
const moment = require('moment');
const mongoose = require('mongoose');

const SingleCategorySubscriptionModel = require('../models/userModel/subs.user.Model');
const AllCategorySubscriptionModel = require('../models/userModel/allSubs.userModel');
const Category = require('../models/adminModel/category.adminModel');

// Corn job that runs every day at midnight
cron.schedule('0 0 * * *', async () => {
    try {
        const models = [SingleCategorySubscriptionModel, AllCategorySubscriptionModel];

        // Loop through both models and delete pending subscriptions
        await Promise.all(models.map(async (model) => {
            await model.deleteMany({ paymentStatus: 'pending' });
        }));
    } catch (error) {
        console.error('Error deleting pending subscriptions:', error);
    }
});

// Cron job that runs every day at hourly
cron.schedule('0 * * * *', async () => {
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
cron.schedule('0 * * * *', sendExpiryReminder);

// convert to iso date format
exports.convertToISODate = (dateString) => {
    // Use a regex to identify the date format
    const regexFormats = [
        { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, parse: (d, m, y) => new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`) }, // DD/MM/YYYY
        { regex: /(\d{1,2})-(\d{1,2})-(\d{4})/, parse: (d, m, y) => new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`) }, // DD-MM-YYYY
        { regex: /(\d{1,2})\/(\d{1,2})\/(\d{2})/, parse: (d, m, y) => new Date(`20${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`) }, // DD/MM/YY
        { regex: /(\d{1,2})-(\d{1,2})-(\d{2})/, parse: (d, m, y) => new Date(`20${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`) }, // DD-MM-YY
        { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, parse: (m, d, y) => new Date(`${y}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`) }, // MM/DD/YYYY
        { regex: /(\d{1,2})-(\d{1,2})-(\d{4})/, parse: (m, d, y) => new Date(`${y}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`) }, // MM-DD-YYYY
        // You can add more formats as necessary
    ];

    for (const { regex, parse } of regexFormats) {
        const match = dateString.match(regex);
        if (match) {
            const date = parse(...match.slice(1));
            // Validate the date
            if (!isNaN(date.getTime())) {
                return date;
            } else {
                throw new Error('Invalid date');
            }
        }
    }

    throw new Error('Invalid date format');
};

// fetch and return the userSubscription 
exports.UserSubscription = async (userId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid userId');
        };

        const [singleSubscription, allSubscription] = await Promise.all([
            SingleCategorySubscriptionModel.findOne({
                userId,
                paymentStatus: 'completed',
                status: 'active'
            }).select('categoryId').lean().exec(),
            AllCategorySubscriptionModel.findOne({
                userId,
                paymentStatus: 'completed',
                status: 'active'
            }).select('categoryId').lean().exec()
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
