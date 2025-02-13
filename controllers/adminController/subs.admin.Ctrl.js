const Subscription = require('../../models/adminModel/subs.adminModel');
const { clearCache } = require('../../middlewares/userMiddleware/redisMidlwr');

exports.createSubscriptionPlan = async (req, res, next) => {
    try {
        let { planName, planType, price, features, flatDiscount } = req.body;

        // Ensure features is an array
        if (!Array.isArray(features)) {
            features = features ? features.split(',').map(feature => feature.trim()) : [];
        }

        // Validate required fields
        if (!features.length) {
            return res.status(400).json({
                success: false,
                status: 400,
                message: 'At least one feature is required'
            });
        }

        // Create and save the new subscription plan
        const newSubscription = new Subscription({
            planName,
            planType,
            price,
            flatDiscount,
            features,
        });
        const savedSubscription = await newSubscription.save();

        // Clear node-cache
        clearCache("node-cache");

        res.status(201).json({
            success: true,
            status: 200,
            message: 'Subscription created successfully',
            data: savedSubscription,
        });

    } catch (error) {
        next(error);
    };
};

exports.getSubscriptionsPlan = async (req, res, next) => {
    try {
        // Fetch all subscription plans and total count in parallel for efficiency
        const [subscriptions, totalSubscription] = await Promise.all([
            Subscription.find({}, { createdAt: 0, updatedAt: 0, __v: 0 }).sort({ createdAt: -1 }).lean(),
            Subscription.countDocuments(),
        ]);

        res.status(200).json({
            success: true,
            status: 200,
            totalSubscription,
            subscriptions,
        });
    } catch (error) {
        next(error)
    };
};

exports.getSubscriptionPlanById = async (req, res, next) => {
    try {
        const { subscriptionId } = req.query;
        const subscription = await Subscription.findById(subscriptionId)
            .select('-createdAt -updatedAt -__v')
            .lean();
        if (!subscription) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: 'Subscription not found',
            });
        };

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Subscription fetched successfully...',
            subscription,
        });
    } catch (error) {
        next(error);
    };
};

exports.updateSubscriptionPlan = async (req, res, next) => {
    try {
        const { subscriptionId } = req.query;
        const updates = req.body;

        const updatedSubscription = await Subscription.findByIdAndUpdate(subscriptionId, updates, {
            new: true,
            runValidators: true,
        });

        if (!updatedSubscription) {
            return res.status(404).json({ success: false, status: 404, message: 'Subscription not found' });
        };

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Subscription updated successfully',
            data: updatedSubscription,
        });
    } catch (error) {
        next(error);
    };
};

exports.deleteSubscriptionPlan = async (req, res, next) => {
    try {
        const { subscriptionId } = req.query;
        const subscription = await Subscription.findByIdAndDelete(subscriptionId);

        if (!subscription) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: 'Subscription not found',
            });
        };

        // Clear node-cache
        clearCache("node-cache");

        res.status(200).json({
            success: true,
            status: 200,
            message: 'Subscription deleted successfully',
            subscription,
        });
    } catch (error) {
        next(error);
    };
};
