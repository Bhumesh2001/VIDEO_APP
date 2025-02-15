const cron = require('node-cron');
const mongoose = require('mongoose');
const Coupon = require('../models/adminModel/coupan.adminModel');
const CouponApplication = require('../models/userModel/coupon.userModel');
const { connectToDB } = require('../config/connect');

// Ensure DB is connected before running queries
const ensureDBConnection = async () => {
    if (mongoose.connection.readyState !== 1) {
        await connectToDB();
        // await new Promise(resolve => setTimeout(resolve, 2000));
    };
};

cron.schedule('0 * * * *', async () => {
    await ensureDBConnection();
    try {
        await Coupon.deleteMany({ expirationDate: { $lt: new Date() } });
    } catch (error) {
        console.error('Error deleting expired coupons:', error.message);
    };
});

cron.schedule('0 * * * *', async () => {
    await ensureDBConnection();

    try {
        await CouponApplication.deleteMany({ status: 'applied' });
    } catch (error) {
        console.error('Error deleting expired coupons:', error.message);
    };
});

exports.generateCouponCode = (length = 8) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let couponCode = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        couponCode += characters[randomIndex];
    };

    return couponCode;
};
