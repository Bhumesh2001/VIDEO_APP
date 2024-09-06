const Subscription = require('../../models/adminModel/subs.adminModel');

exports.createSubscription = async (req, res) => {
    try {
        const { plan, price, features, status } = req.body;

        if (!features || !Array.isArray(features) || features.length === 0) {
            return res.status(400).json({ error: 'At least one feature is required' });
        };

        const newSubscription = new Subscription({
            plan,
            price,
            features,
            status,
        });

        const savedSubscription = await newSubscription.save();

        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            data: savedSubscription,
        });
    } catch (error) {
        console.log(error);
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: validationErrors,
            });
        };
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: `Subscripition plan already exists!`,
            });
        };
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    };
};

exports.getSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find({});
        const totalSubscription = await Subscription.countDocuments();

        res.status(200).json({
            success: true,
            totalSubscription,
            subscriptions,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve subscriptions',
            error: error.message,
        });
    };
};

exports.getSubscriptionById = async (req, res) => {
    try {
        const { subscriptionId } = req.query;

        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found',
            });
        };

        res.status(200).json({
            success: true,
            message: 'Subscription fetched successfully...',
            subscription,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve subscription',
            error: error.message,
        });
    };
};

exports.updateSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.query;
        const updates = req.body;

        if (updates.features && (!Array.isArray(updates.features) || updates.features.length === 0)) {
            return res.status(400).json({ error: 'At least one feature is required' });
        };

        const updatedSubscription = await Subscription.findByIdAndUpdate(subscriptionId, updates, {
            new: true,
            runValidators: true,
        });

        if (!updatedSubscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        };

        res.status(200).json({
            success: true,
            message: 'Subscription updated successfully',
            data: updatedSubscription,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update subscription',
            error: error.message,
        });
    };
};

exports.deleteSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.query;
        const subscription = await Subscription.findByIdAndDelete(subscriptionId);

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found',
            });
        };

        res.status(200).json({
            success: true,
            message: 'Subscription deleted successfully',
            subscription,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete subscription',
            error: error.message,
        });
    };
};
