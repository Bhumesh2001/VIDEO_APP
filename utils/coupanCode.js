const cron = require('node-cron');
const mongoose = require('mongoose');
const Coupon = require('../models/adminModel/coupan.adminModel');
const CouponApplication = require('../models/userModel/coupon.userModel');
const { connectToDB } = require('../config/connect');

// Persistent DB Connection with Retry
const connectWithRetry = async (retries = 5, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            if (mongoose.connection.readyState !== 1) {
                await connectToDB();
            }
            // console.log('MongoDB connected for cron jobs');
            return;
        } catch (err) {
            console.error(`DB connection attempt ${i + 1} failed:`, err.message);
            if (i === retries - 1) throw new Error('Failed to connect to MongoDB after retries');
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// Combined Cron Job
const cleanExpiredData = async () => {
    try {
        await connectWithRetry();

        const now = new Date();

        // Delete expired coupons
        const deletedCoupons = await Coupon.deleteMany({ expirationDate: { $lt: now } });

        // Delete applied coupon applications
        await CouponApplication.deleteMany({ status: 'applied' });
        // console.log(`Deleted ${deletedApplications.deletedCount} applied coupon applications`);

    } catch (error) {
        console.error('Error in cleanup cron job:', error.message);
    }
};

// Schedule Cron Job (runs hourly)
cron.schedule('0 * * * *', cleanExpiredData, {
    scheduled: true,
    timezone: 'UTC' // Adjust as needed
});

// Generate Unique Coupon Code
exports.generateCouponCode = async (length = 8) => {
    if (length <= 0 || !Number.isInteger(length)) {
        throw new Error('Coupon code length must be a positive integer');
    }

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
        let couponCode = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            couponCode += characters[randomIndex];
        }

        // Check uniqueness in DB
        const existingCoupon = await Coupon.findOne({ code: couponCode });
        if (!existingCoupon) {
            return couponCode;
        }
        attempts++;
    }

    throw new Error('Failed to generate unique coupon code after maximum attempts');
};

// Initialize DB Connection on Startup
connectWithRetry().catch(err => {
    console.error('Initial DB connection failed:', err.message);
    process.exit(1);
});
