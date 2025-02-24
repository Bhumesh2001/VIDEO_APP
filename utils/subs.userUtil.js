const cron = require('node-cron');
const mongoose = require('mongoose');
const User = require('../models/userModel/userModel');
const SingleCategorySubscriptionModel = require('../models/userModel/subs.user.Model');
const AllCategorySubscriptionModel = require('../models/userModel/allSubs.userModel');
const Category = require('../models/adminModel/category.adminModel');
const { sendNotificationEmail, sendNotificationEmail2 } = require('../services/emailService');
const { connectToDB } = require('../config/connect');

// Persistent DB Connection with Retry
const connectWithRetry = async (retries = 5, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            if (mongoose.connection.readyState !== 1) await connectToDB();
            // console.log('MongoDB connected for cron jobs');
            return;
        } catch (err) {
            console.error(`DB connection attempt ${i + 1} failed:`, err.message);
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, delay));
        }
    }
};

// Cron Tasks
const updateSubscriptionStatus = async () => {
    try {
        const now = new Date();
        const [singleResult, allResult] = await Promise.all([
            SingleCategorySubscriptionModel.updateMany(
                { expiryDate: { $lt: now }, status: 'active' },
                { $set: { status: 'expired' } },
                { maxTimeMS: 30000 }
            ),
            AllCategorySubscriptionModel.updateMany(
                { expiryDate: { $lt: now }, status: 'active' },
                { $set: { status: 'expired' } },
                { maxTimeMS: 30000 }
            ),
        ]);
        // console.log(`Updated ${singleResult.modifiedCount} single, ${allResult.modifiedCount} all subscriptions`);
    } catch (error) {
        console.error('Error updating subscription statuses:', error.message);
        throw error; // Escalate for monitoring
    }
};

const deletePendingSubscription = async () => {
    try {
        const [singleResult, allResult] = await Promise.all([
            SingleCategorySubscriptionModel.deleteMany({ paymentStatus: 'pending' }, { maxTimeMS: 30000 }),
            AllCategorySubscriptionModel.deleteMany({ paymentStatus: 'pending' }, { maxTimeMS: 30000 }),
        ]);
        // console.log(`Deleted ${singleResult.deletedCount} single, ${allResult.deletedCount} all pending subscriptions`);
    } catch (error) {
        console.error('Error deleting pending subscriptions:', error.message);
        throw error;
    }
};

const sendExpiryReminder = async () => {
    try {
        const now = new Date();
        const reminderDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        const subscriptions = await Promise.all([
            SingleCategorySubscriptionModel.aggregate([
                { $match: { expiryDate: { $lte: reminderDate, $gt: now }, status: 'active' } },
                { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
                { $unwind: '$user' },
                { $project: { email: '$user.email' } },
            ]).option({ maxTimeMS: 30000 }),
            AllCategorySubscriptionModel.aggregate([
                { $match: { expiryDate: { $lte: reminderDate, $gt: now }, status: 'active' } },
                { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
                { $unwind: '$user' },
                { $project: { email: '$user.email' } },
            ]).option({ maxTimeMS: 30000 }),
        ]);

        const allSubs = [...subscriptions[0], ...subscriptions[1]];
        if (!allSubs.length) return;

        await Promise.all(allSubs.map(sub =>
            sendNotificationEmail(sub.email, {
                subject: 'Your subscription is expiring soon.',
                renewLink: 'https://example.com',
            })
        ));
        // console.log(`Sent ${allSubs.length} expiry reminders`);
    } catch (error) {
        console.error('Error sending expiry reminders:', error.message);
        throw error;
    }
};

const markSubscriptionsAsExpired = async () => {
    try {
        const now = new Date();
        const subscriptions = await Promise.all([
            SingleCategorySubscriptionModel.find(
                { expiryDate: { $lt: now }, status: 'active', paymentStatus: 'completed' },
                'userId',
                { maxTimeMS: 30000 }
            ).lean(),
            AllCategorySubscriptionModel.find(
                { expiryDate: { $lt: now }, status: 'active', paymentStatus: 'completed' },
                'userId',
                { maxTimeMS: 30000 }
            ).lean(),
        ]);

        const uniqueUserIds = [...new Set([...subscriptions[0], ...subscriptions[1]].map(s => s.userId))];
        if (!uniqueUserIds.length) return;

        const users = await User.find({ _id: { $in: uniqueUserIds } }, 'email name expiryDate').lean();
        await Promise.all(users.map(user =>
            sendNotificationEmail2(user.email, {
                subject: 'Subscription expired!',
                renewLink: 'https://example.com',
                expiryDate: user.expiryDate,
                username: user.name,
            })
        ));
        // console.log(`Processed ${users.length} expired subscriptions`);
    } catch (error) {
        console.error('Error processing expired subscriptions:', error.message);
        throw error;
    }
};

// Schedule Cron Jobs with Locking (Basic Concurrency Control)
const runningTasks = new Set();
const runTask = (task, name) => async () => {
    if (runningTasks.has(name)) return;
    runningTasks.add(name);
    try {
        await task();
    } finally {
        runningTasks.delete(name);
    }
};

cron.schedule('*/5 * * * *', runTask(updateSubscriptionStatus, 'updateSubscriptionStatus'), { timezone: 'UTC' });
cron.schedule('*/10 * * * *', runTask(sendExpiryReminder, 'sendExpiryReminder'), { timezone: 'UTC' });
cron.schedule('*/15 * * * *', runTask(markSubscriptionsAsExpired, 'markSubscriptionsAsExpired'), { timezone: 'UTC' });
cron.schedule('0 * * * *', runTask(deletePendingSubscription, 'deletePendingSubscription'), { timezone: 'UTC' });

// Initialize DB Connection
connectWithRetry().catch(err => {
    console.error('Initial DB connection failed:', err.message);
    process.exit(1);
});

// Utility Functions
exports.convertToISODate = (dateString) => {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) return date.toISOString();
    throw new Error('Invalid date format');
};

exports.UserSubscription = async (userId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error(`Invalid userId: ${userId}`);
        const [singleSub, allSub] = await Promise.all([
            SingleCategorySubscriptionModel.findOne({ userId, paymentStatus: 'completed', status: 'active' })
                .select('categoryId').lean(),
            AllCategorySubscriptionModel.findOne({ userId, paymentStatus: 'completed', status: 'active' })
                .select('categoryId').lean(),
        ]);

        const userSubscription = allSub || singleSub;
        if (!userSubscription) return null;

        return userSubscription.categoryId && mongoose.Types.ObjectId.isValid(userSubscription.categoryId)
            ? await Category.findById(userSubscription.categoryId).lean() || { name: 'unknown' }
            : { name: 'all' };
    } catch (error) {
        console.error('Error in UserSubscription:', error.message);
        throw error;
    }
};

exports.isValidRazorpayOrderId = (orderId) => /^order_[a-zA-Z0-9]{14,}$/.test(orderId);
