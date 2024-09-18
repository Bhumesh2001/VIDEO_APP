const SingleCategorySubscriptionModel = require('../models/userModel/subs.user.Model');
const AllCategorySubscriptionModel = require('../models/userModel/subsAll.userModle');

exports.checkSingleCategorySubscriptionStatus = async (userId, categoryId) => {
    const subscription = await SingleCategorySubscriptionModel.findOne({ userId, categoryId });

    if (!subscription) {
        console.log('No subscription found for this category.');
    };

    if (subscription.status === 'expired' || new Date() > subscription.expiryDate) {
        subscription.status = 'expired';  // Optional: Update status to 'expired'
        await subscription.save();
        console.log('Your subscription has expired.');
    };

    return subscription;
};

exports.checkAllCategorySubscriptionStatus = async (userId) => {
    const subscription = await AllCategorySubscriptionModel.findOne({ userId });

    if (!subscription) {
        console.log('No all-category subscription found.');
    };

    if (subscription.status === 'expired' || new Date() > subscription.expiryDate) {
        subscription.status = 'expired';
        await subscription.save();
        console.log('Your all-category subscription has expired.');
    };

    return subscription;
};
