const cron = require('node-cron');
const Coupon = require('../models/adminModel/coupan.adminModel');

cron.schedule('0 * * * *', async () => {
    try {
       await Coupon.deleteMany({ expirationDate: { $lt: new Date() } });
    } catch (error) {
        console.error('Error deleting expired coupons:', error);
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
