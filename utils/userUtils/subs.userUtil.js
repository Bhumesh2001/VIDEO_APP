const cron = require('node-cron');
const userPaymentModel = require('../../models/userModel/payment.userModel');

const checkAndUpdateExpiredSubscriptions = async () => {
    try {
        const currentDate = new Date();

        const expiredSubscriptions = await userPaymentModel.find({
            subscriptionType: 'subscription',
            expiryDate: { $lt: currentDate },
        });

        if (expiredSubscriptions.length > 0) {
            for (const subscription of expiredSubscriptions) {
                await userPaymentModel.deleteOne({
                    userId: subscription.userId,
                    category: subscription.category
                });
                console.log(`
                    Subscription expired for userId: ${subscription.userId} 
                    in category: ${subscription.category}`
                );
            };
        };
    } catch (error) {
        console.error('Error checking expired subscriptions:', error);
    };
};

cron.schedule('* * * * *', checkAndUpdateExpiredSubscriptions, {
    timezone: "UTC"
});
