const mongoose = require('mongoose');
const UserPayment = require('../../models/userModel/payment.userModel');
const CategoryModel = require('../../models/adminModel/category.adminModel');
const Coupon = require('../../models/adminModel/coupan.adminModel');

const SingleCategorySubscriptionModel = require('../../models/userModel/subs.user.Model');
const AllCategorySubscriptionModel = require('../../models/userModel/allSubs.userModel');

const SubscriptionPlan = require('../../models/adminModel/subs.adminModel');

exports.subscribeToCategoryOrAll = async (req, res) => {
    const { categoryId, planId, couponCode } = req.body;

    try {
        const userId = req.user._id;
        if (!userId) {
            return res.status(404).json({
                success: false,
                message: 'User ID not found!',
            });
        };

        // Validate category ID if not subscribing to 'all'
        if (categoryId !== 'all' && categoryId !== 'All' && !mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format!',
            });
        };
        
        // Fetch the subscription plan
        const subscriptionPlan = await SubscriptionPlan.findById(planId);
        if (!subscriptionPlan) {
            return res.status(404).json({
                success: false,
                message: 'Subscription plan not found!',
            });
        };

        // If a coupon code is provided, validate the coupon
        let coupon = null;
        if (couponCode) {
            coupon = await Coupon.findOne({ couponCode });

            if (!coupon) {
                return res.status(404).json({
                    success: false,
                    message: 'Invalid coupon code.',
                });
            };

            if (coupon.isExpired()) {
                return res.status(400).json({
                    success: false,
                    message: 'Coupon has expired.',
                });
            };

            if (coupon.status !== 'Active') {
                return res.status(400).json({
                    success: false,
                    message: 'Coupon is inactive.',
                });
            };
        };

        // Check for existing subscriptions for the user
        const existingSingleSubscription = await SingleCategorySubscriptionModel.findOne({ userId });
        const existingAllSubscription = await AllCategorySubscriptionModel.findOne({ userId });

        if (existingSingleSubscription || existingAllSubscription) {
            return res.status(409).json({
                success: false,
                message: 'Subscription already taken!',
            });
        };

        // Initialize discount values
        const discountFromPlan = subscriptionPlan.discount || 0;
        const discountFromCoupon = coupon ? coupon.discountPercentage : 0;

        // Create the new subscription
        let newSubscription;
        if (categoryId === 'all' || categoryId === 'All') {
            newSubscription = new AllCategorySubscriptionModel({
                userId,
                planName: subscriptionPlan.planName,
                planType: subscriptionPlan.planType,
                totalPrice: subscriptionPlan.price,
                discountFromPlan,
                discountFromCoupon,
            });
        } 
        else {
            // Validate category existence before creating subscription
            const category = await CategoryModel.findById(categoryId);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found!',
                });
            };

            newSubscription = new SingleCategorySubscriptionModel({
                userId,
                categoryId,
                planName: subscriptionPlan.planName,
                planType: subscriptionPlan.planType,
                totalPrice: subscriptionPlan.price,
                discountFromPlan,
                discountFromCoupon,
            });
        };

        // Calculate final price and save subscription
        newSubscription.calculateFinalPrice(); // Assuming this function exists
        await newSubscription.save();

        res.status(201).json({
            success: true,
            message: `Successfully subscribed to ${categoryId === 'all' ? 'all categories' : 'the selected category'}.`,
            subscription: newSubscription,
        });

    } catch (error) {
        console.error(error);

        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: validationErrors,
            });
        };

        res.status(500).json({
            success: false,
            message: 'Error occurred while creating the subscription',
            error,
        });
    };
};

exports.mySubscription = async (req, res) => {
    try {
        const userId = req.user._id;

        const [singleCategorySubscription, allCategorySubscription] = await Promise.all([
            SingleCategorySubscriptionModel.findOne({ userId }),
            AllCategorySubscriptionModel.findOne({ userId })
        ]);

        if (!singleCategorySubscription && !allCategorySubscription) {
            return res.status(404).json({
                success: false,
                message: 'No subscriptions found for this user.',
            });
        };

        const subscriptionData = {
            singleCategorySubscription: singleCategorySubscription || null,
            allCategorySubscription: allCategorySubscription || null,
        };

        res.status(200).json({
            success: true,
            message: 'Subscriptions fetched successfully!',
            subscription: subscriptionData,
        });

    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the subscriptions.',
        });
    };
};

exports.getHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        if (!userId) {
            return res.status(404).json({
                success: true,
                message: "userId not found",
            });
        };

        const payments = await UserPayment.find({ userId }, { __v: 0 });
        if (payments.length === 0) {
            return res.status(404).json({
                success: true,
                message: "History not found!"
            });
        };
        res.status(200).json({
            success: true,
            message: "History fetched successfully...",
            payments,
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Error occured while fetching the History",
        });
    };
};
