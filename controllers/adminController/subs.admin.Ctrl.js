const Subscription = require('../../models/adminModel/subs.adminModel');

exports.createSubscription = async (req, res) => {
    try {
        const { name, price, duration, features, isActive } = req.body;

        const newSubscription = new Subscription({
            name,
            price,
            duration,
            features,
            isActive,
        });

        await newSubscription.save();
        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            data: newSubscription,
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
            const field = Object.keys(error.keyValue);
            return res.status(409).json({
                success: false,
                message: `Duplicate field value entered for ${field}: ${error.keyValue[field]}. 
                Please use another value!`,
            });
        };
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    }
};

exports.getSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find();
        const totalSubscription = await Subscription.countDocuments();
        const response = {
            totalSubscription,
            subscriptions
        };
        res.status(200).json({
            success: true,
            subscriptions: response,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve subscriptions',
            error: error.message,
        });
    };
};

exports.getSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.query || req.body;

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
        const { subscriptionId } = req.query || req.body;
        const { name, price, duration, features, isActive } = req.body;

        if (!name && !price && !duration && !features && isActive === undefined) {
            return res.status(400).json({
                success: false,
                message: 'At least one field is required to update',
            });
        }

        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found',
            });
        }

        if (name) subscription.name = name;
        if (price) subscription.price = price;
        if (duration) subscription.duration = duration;
        if (features) subscription.features = features;
        if (isActive !== undefined) subscription.isActive = isActive;

        await subscription.save();
        res.status(200).json({
            success: true,
            message: 'Subscription updated successfully',
            data: subscription,
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
        const { subscriptionId } = req.query || req.body;
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
