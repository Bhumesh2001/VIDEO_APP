const Subscription = require('../../models/adminModel/subs.adminModel');

exports.createSubscriptionPlan = async (req, res) => {
    try {
        let { planName, planType, price, features, status } = req.body;

        // Ensure features is an array
        if (!Array.isArray(features)) {
            features = features ? features.split(',').map(feature => feature.trim()) : [];
        }

        // Validate required fields
        if (!features.length) {
            return res.status(400).json({ 
                success: false,
                message: 'At least one feature is required'
            });
        }

        // Create and save the new subscription plan
        const newSubscription = new Subscription({
            planName,
            planType,
            price,
            features,
            status: status?.toLowerCase(),  // Handle possible null or undefined
        });

        const savedSubscription = await newSubscription.save();

        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            data: savedSubscription,
        });

    } catch (error) {
        console.error('Error creating subscription plan:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: validationErrors,
            });
        }

        // Handle duplicate subscription plan error
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Subscription plan already exists!',
            });
        }

        // Generic server error
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message,
        });
    }
};

exports.getSubscriptionsPlan = async (req, res) => {
    try {
        // Fetch all subscription plans and total count in parallel for efficiency
        const [subscriptions, totalSubscription] = await Promise.all([
            Subscription.find({}).sort({ createdAt: -1 }),
            Subscription.countDocuments()
        ]);

        res.status(200).json({
            success: true,
            totalSubscription,
            subscriptions,
        });
    } catch (error) {
        console.error('Error retrieving subscriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve subscriptions',
            error: error.message,
        });
    }
};

exports.getSubscriptionPlanById = async (req, res) => {
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

exports.updateSubscriptionPlan = async (req, res) => {
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

exports.deleteSubscriptionPlan = async (req, res) => {
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
