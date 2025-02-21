const cron = require("node-cron");
const mongoose = require("mongoose");
const User = require("../models/userModel/userModel");
const SingleCategorySubscriptionModel = require("../models/userModel/subs.user.Model");
const AllCategorySubscriptionModel = require("../models/userModel/allSubs.userModel");
const { sendNotificationEmail, sendNotificationEmail2 } = require("../services/emailService");
const { connectToDB } = require('../config/connect');
const Category = require('../models/adminModel/category.adminModel');

const ensureConnection = async () => {
    if (mongoose.connection.readyState !== 1) {
        throw new Error("MongoDB not connected");
    }
};

// 1. Update Subscription Status (Every 5 min)
const updateSubscriptionStatus = async () => {
    await ensureConnection();
    try {
        const now = new Date();
        await Promise.all([
            SingleCategorySubscriptionModel.updateMany(
                { expiryDate: { $lt: now }, status: "active" },
                { $set: { status: "expired" } },
                { maxTimeMS: 30000 }
            ),
            AllCategorySubscriptionModel.updateMany(
                { expiryDate: { $lt: now }, status: "active" },
                { $set: { status: "expired" } },
                { maxTimeMS: 30000 }
            ),
        ]);
    } catch (error) {
        console.error("Error updating subscription statuses:", error.message);
    }
};

// 2. Delete Pending Subscriptions (Every Hour)
const deletePendingSubscription = async () => {
    await ensureConnection();
    try {
        await Promise.all([
            SingleCategorySubscriptionModel.deleteMany({ paymentStatus: "pending" }, { maxTimeMS: 30000 }),
            AllCategorySubscriptionModel.deleteMany({ paymentStatus: "pending" }, { maxTimeMS: 30000 }),
        ]);
    } catch (error) {
        console.error("Error deleting pending subscriptions:", error.message);
    }
};

// 3. Send Expiry Reminder Emails (Every 10 min)
const sendExpiryReminder = async () => {
    await ensureConnection();
    try {
        const now = new Date();
        const reminderDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        const subscriptions = await SingleCategorySubscriptionModel.aggregate([
            {
                $match: {
                    expiryDate: { $lte: reminderDate, $gt: now },
                    status: "active",
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            { $project: { email: "$user.email" } },
        ]).option({ maxTimeMS: 30000 });

        if (subscriptions.length === 0) return;

        await Promise.all(subscriptions.map(sub =>
            sendNotificationEmail(sub.email, {
                subject: "Your subscription is expiring soon.",
                renewLink: "https://example.com",
            })
        ));
    } catch (error) {
        console.error("Error sending expiry reminders:", error.message);
    }
};

// 4. Mark Expired Subscriptions & Send Emails (Every 15 min)
const markSubscriptionsAsExpired = async () => {
    await ensureConnection();
    try {
        const now = new Date();
        const subscriptions = await SingleCategorySubscriptionModel.find(
            { expiryDate: { $lt: now }, status: "active", paymentStatus: "completed" },
            "userId",
            { maxTimeMS: 30000 }
        ).lean();

        const uniqueUserIds = [...new Set(subscriptions.map(s => s.userId))];
        if (uniqueUserIds.length === 0) return;

        const users = await User.find({ _id: { $in: uniqueUserIds } }, "email name expiryDate").lean();

        await Promise.all(users.map(user =>
            sendNotificationEmail2(user.email, {
                subject: "Subscription expired!",
                renewLink: "https://example.com",
                expiryDate: user.expiryDate,
                username: user.name,
            })
        ));
    } catch (error) {
        console.error("Error processing expired subscriptions:", error.message);
    }
};

// Schedule Cron Jobs
cron.schedule("*/5 * * * *", updateSubscriptionStatus);
cron.schedule("*/10 * * * *", sendExpiryReminder);
cron.schedule("*/15 * * * *", markSubscriptionsAsExpired);
cron.schedule("0 * * * *", deletePendingSubscription);

connectToDB();

// 📌 Convert to ISO Date Format
exports.convertToISODate = (dateString) => {
    const regexFormats = [
        {
            regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
            parse: (d, m, y) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        },
        {
            regex: /(\d{1,2})-(\d{1,2})-(\d{4})/,
            parse: (d, m, y) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        },
    ];

    for (const { regex, parse } of regexFormats) {
        const match = dateString.match(regex);
        if (match) {
            const date = new Date(parse(...match.slice(1)));
            if (!isNaN(date.getTime())) return date;
        }
    }
    throw new Error("Invalid date format");
};

// 📌 Fetch User Subscription
exports.UserSubscription = async (userId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error(`Invalid userId: ${userId}`);
        }

        const [singleSub, allSub] = await Promise.all([
            SingleCategorySubscriptionModel.findOne({
                userId,
                paymentStatus: "completed",
                status: "active",
            })
                .select("categoryId")
                .lean(),
            AllCategorySubscriptionModel.findOne({
                userId,
                paymentStatus: "completed",
                status: "active",
            })
                .select("categoryId")
                .lean(),
        ]);

        const userSubscription = allSub || singleSub; // Prioritize "all" subscription
        if (!userSubscription) return null;

        if (userSubscription.categoryId && mongoose.Types.ObjectId.isValid(userSubscription.categoryId)) {
            const category = await Category.findById(userSubscription.categoryId).lean();
            if (!category) throw new Error(`Category not found for ID: ${userSubscription.categoryId}`);
            return category;
        } else {
            return { name: "all" };
        }
    } catch (error) {
        console.error("Error in UserSubscription:", error);
        throw error;
    }
};

// 📌 Validate Razorpay Order ID
exports.isValidRazorpayOrderId = (orderId) => /^order_[a-zA-Z0-9]{14}$/.test(orderId);
