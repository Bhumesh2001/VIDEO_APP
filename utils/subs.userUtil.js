const cron = require('node-cron');
const moment = require('moment');
const mongoose = require('mongoose');

const SingleCategorySubscriptionModel = require('../models/userModel/subs.user.Model');
const AllCategorySubscriptionModel = require('../models/userModel/allSubs.userModel');
const Category = require('../models/adminModel/category.adminModel');
const userModel = require('../models/userModel/userModel');
const { sendNotification } = require('../utils/email');

// 1. Update Subscription Status
const updateSubscriptionStatus = async () => {
    const now = moment().toDate();
    try {
        await SingleCategorySubscriptionModel.updateMany(
            { expiryDate: { $lt: now }, status: 'active' },
            { $set: { status: 'expired' } }
        );

        await AllCategorySubscriptionModel.updateMany(
            { expiryDate: { $lt: now }, status: 'active' },
            { $set: { status: 'expired' } }
        );

    } catch (error) {
        console.error('Error updating subscription statuses:', error);
    };
};

// 2. Delete pending subscription
const deletePendingSubscription = async () => {
    try {
        const models = [SingleCategorySubscriptionModel, AllCategorySubscriptionModel];

        await Promise.all(models.map(async (model) => {
            await model.deleteMany({ paymentStatus: 'pending' });
        }));

    } catch (error) {
        console.error('Error deleting pending subscriptions:', error);
    }
};

// 3. Send Expiry Reminders
const sendExpiryReminder = async () => {
    const now = moment();
    const reminderDate = now.add(3, 'days').toDate();

    try {
        const data = {
            subject: 'Your subscription is expiring soon.',
            text: `<pre>We hope this message finds you well.
            We wanted to remind you that your subscription is due for renewal.
            To continue enjoying our services without interruption, 
            please take a moment to renew your subscription.
            Thank you for being a valued part of our community. 
            If you have any questions or need assistance, our support team is here to help.
            </pre>`
        };

        const singleCategoryExpiring = await SingleCategorySubscriptionModel.find({
            expiryDate: { $lte: reminderDate, $gt: now.toDate() },
            status: 'active',
        });

        singleCategoryExpiring.forEach(async subscription => {
            const user = await userModel.findById(subscription.userId);
            sendNotification(user.email, data);
        });

        const allCategoryExpiring = await AllCategorySubscriptionModel.find({
            expiryDate: { $lte: reminderDate, $gt: now.toDate() },
            status: 'active',
        });

        allCategoryExpiring.forEach(async subscription => {
            const user = await userModel.findById(subscription.userId);
            sendNotification(user.email, data);
        });
        
    } catch (error) {
        console.error('Error checking expiring subscriptions:', error);
    };
};

// 4. Mark Subscriptions as Expired
const markSubscriptionsAsExpired = async () => {
    try {
        const models = [SingleCategorySubscriptionModel, AllCategorySubscriptionModel];

        await Promise.all(models.map(async (model) => {
            const expiredSubscriptions = await model.find({
                paymentStatus: 'completed',
                status: 'active',
                expiryDate: { $lt: new Date() }
            });

            for (const subscription of expiredSubscriptions) {
                const user = await userModel.findById(subscription.userId);
                if (user) {
                    const data = {
                        subject: 'Subscription expired!',
                        text: `Your subscription has expired. Please renew to continue enjoying our services`,
                    }
                    sendNotification(user.email, data);
                };
            }
        }));

    } catch (error) {
        console.error('Error processing subscriptions:', error);
    }
};

// 1. Update subscription status (runs every minute)
cron.schedule('* * * * *', updateSubscriptionStatus);

// 2. Send expiry reminders (runs every minutes)
cron.schedule('* * * * *', sendExpiryReminder);

// 3. Mark expired subscriptions (runs every minutes)
cron.schedule('* * * * *', markSubscriptionsAsExpired);

// 4. Delete pending subscriptions (runs every hour)
cron.schedule('0 * * * *', deletePendingSubscription);

// convert to iso date format
exports.convertToISODate = (dateString) => {
    // Use a regex to identify the date format
    const regexFormats = [
        {
            regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
            parse: (d, m, y) => new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
        }, // DD/MM/YYYY
        {
            regex: /(\d{1,2})-(\d{1,2})-(\d{4})/,
            parse: (d, m, y) => new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
        }, // DD-MM-YYYY
        {
            regex: /(\d{1,2})\/(\d{1,2})\/(\d{2})/,
            parse: (d, m, y) => new Date(`20${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
        }, // DD/MM/YY
        {
            regex: /(\d{1,2})-(\d{1,2})-(\d{2})/,
            parse: (d, m, y) => new Date(`20${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
        }, // DD-MM-YY
        {
            regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
            parse: (m, d, y) => new Date(`${y}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`)
        }, // MM/DD/YYYY
        {
            regex: /(\d{1,2})-(\d{1,2})-(\d{4})/,
            parse: (m, d, y) => new Date(`${y}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`)
        }, // MM-DD-YYYY
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
