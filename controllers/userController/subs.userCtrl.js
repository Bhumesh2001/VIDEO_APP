const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const crypto = require('crypto');

const Coupon = require('../../models/adminModel/coupan.adminModel');
const CouponApplication = require('../../models/userModel/coupon.userModel');
const SubscriptionPlan = require('../../models/adminModel/subs.adminModel');

const SingleCategorySubscriptionModel = require('../../models/userModel/subs.user.Model');
const AllCategorySubscriptionModel = require('../../models/userModel/allSubs.userModel');

const { isValidRazorpayOrderId } = require('../../utils/subs.userUtil');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID_KEY,
    key_secret: process.env.RAZORPAY_SECRET_KEY
});

exports.subscribeToCategoryOrAll = async (req, res) => {
    const { categoryId, planId } = req.body;

    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(404).json({
                success: false,
                message: 'User ID not found!',
            });
        }

        // Validate category ID and plan ID
        if (categoryId.toLowerCase() !== 'all' && !mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format!',
            });
        }

        if (!mongoose.Types.ObjectId.isValid(planId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid planId format!',
            });
        }

        // Fetch the subscription plan
        const subscriptionPlan = await SubscriptionPlan.findById(planId);
        if (!subscriptionPlan) {
            return res.status(404).json({
                success: false,
                message: 'Subscription plan not found!',
            });
        }

        if (categoryId.toLowerCase() === 'all' && !subscriptionPlan.isAllCategory) {
            return res.status(400).json({
                success: false,
                message: `You must select the All Access plan for all categories!`,
            });
        }

        // Check for existing subscriptions
        const existingSubscription = await Promise.any([
            SingleCategorySubscriptionModel.findOne({ userId, paymentStatus: 'completed', status: 'active' }),
            AllCategorySubscriptionModel.findOne({ userId, paymentStatus: 'completed', status: 'active' }),
        ]);

        if (existingSubscription) {
            return res.status(409).json({
                success: false,
                message: 'Subscription already taken!',
            });
        }

        // Initialize discount and total price
        let totalPrice = subscriptionPlan.price;
        let discountFromPlan = subscriptionPlan.discount || 0;
        let discountFromCoupon = 0;

        // Apply any valid coupon discount
        const couponApplication = await CouponApplication.findOne({ userId });
        if (couponApplication) {
            const appliedCoupon = await Coupon.findOne({ couponCode: couponApplication.couponCode });
            discountFromCoupon = appliedCoupon?.discountPercentage || 0;
            totalPrice = couponApplication.finalPrice;
        }

        // Calculate final price with applicable discounts
        const discountAmount = (totalPrice * discountFromPlan) / 100;
        let flatDiscountAmount = 0;

        // Apply flat 10% discount only for "All Categories" subscription
        if (categoryId.toLowerCase() === 'all') {
            const flatDiscount = subscriptionPlan.flatDiscount;  // Flat 10% discount for all categories
            flatDiscountAmount = (totalPrice * flatDiscount) / 100;
        }

        const finalPrice = totalPrice - discountAmount - flatDiscountAmount;

        // Prepare Razorpay order
        const receipt = `receipt_${crypto.randomBytes(4).toString('hex')}_${Date.now()}`;
        const order = await razorpay.orders.create({
            amount: finalPrice * 100,
            currency: 'INR',
            receipt,
            payment_capture: 1,
        });

        // Create new subscription model
        const newSubscription = categoryId.toLowerCase() === 'all'
            ? new AllCategorySubscriptionModel({
                userId,
                categoryId,
                planId,
                planType: subscriptionPlan.planType,
                price: subscriptionPlan.price,
                discountFromPlan,
                discountFromCoupon,
                flatDiscount: flatDiscountAmount ? subscriptionPlan.flatDiscount : 0,  // Only apply if flat discount was applied
                finalPrice,
            })
            : new SingleCategorySubscriptionModel({
                userId,
                categoryId,
                planId,
                planType: subscriptionPlan.planType,
                price: subscriptionPlan.price,
                discountFromPlan,
                discountFromCoupon,
                flatDiscount: flatDiscountAmount ? subscriptionPlan.flatDiscount : 0,
                finalPrice,
            });

        await newSubscription.save();

        // Response object
        return res.status(201).json({
            success: true,
            message: `Successfully subscribed to ${categoryId.toLowerCase() === 'all' ? 'all categories' : 'the selected category'}.`,
            orderId: order.id,
            ...newSubscription.toObject(),
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
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Subscription already exists!',
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error occurred while creating the subscription',
            error: error.message,
        });
    }
};

exports.updateSubscriptionStatus = async (req, res) => {
    try {
        const { paymentStatus = 'completed', categoryId, planId } = req.body;
        const userId = req.user._id;

        const subscriptionPlan = await SubscriptionPlan.findById(planId);
        if (!subscriptionPlan) {
            return res.status(404).json({
                success: false,
                message: 'Subscription plan not found!',
            });
        };

        if (categoryId.toLowerCase() === 'all' && !subscriptionPlan.isAllCategory) {
            return res.status(400).json({
                success: false,
                message: `You must select the All Access plan for update the paymentStatus!`,
            });
        }

        // Determine which subscription to query based on categoryId
        let subscriptionPromise;
        if (categoryId.toLowerCase() === 'all') {
            subscriptionPromise = AllCategorySubscriptionModel.findOne({ userId, categoryId, planId });
        } else {
            subscriptionPromise = SingleCategorySubscriptionModel.findOne({ userId, categoryId, planId });
        }

        // Wait for the selected subscription to be fetched
        const subscription = await subscriptionPromise;

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found!',
            });
        }

        // Check if payment status is already completed
        if (subscription.paymentStatus === "completed") {
            return res.status(409).json({
                success: false,
                message: 'Subscription already updated!',
                subscription,
            });
        }

        // Update subscription payment status
        subscription.paymentStatus = paymentStatus;
        await subscription.save();

        return res.status(200).json({
            success: true,
            message: 'Subscription status updated successfully.',
            subscription,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

exports.mySubscription = async (req, res) => {
    try {
        const userId = req.user._id;

        const [singleCategorySubscription, allCategorySubscription] = await Promise.all([
            SingleCategorySubscriptionModel.findOne({
                userId,
                paymentStatus: 'completed',
                status: 'active'
            }),
            AllCategorySubscriptionModel.findOne({
                userId,
                paymentStatus: 'completed',
                status: 'active'
            })
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
        const userId = req.user?._id;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID not found",
            });
        }

        const [singleSubscriptions, allSubscriptions] = await Promise.all([
            SingleCategorySubscriptionModel.find({
                userId,
                paymentStatus: { $in: ['completed', 'failed'] }
            }),
            AllCategorySubscriptionModel.find({
                userId,
                paymentStatus: { $in: ['completed', 'failed'] }
            })
        ]);

        // Check if both subscriptions are empty
        if (!singleSubscriptions.length && !allSubscriptions.length) {
            return res.status(404).json({
                success: false,
                message: "History not found!",
            });
        }

        res.status(200).json({
            success: true,
            message: "History fetched successfully",
            history: [...singleSubscriptions, ...allSubscriptions],
        });

    } catch (error) {
        console.error('Error fetching history:', error);  // Improved error logging
        res.status(500).json({
            success: false,
            message: "Error occurred while fetching the history",
            error: error.message,  // Added more detailed error message
        });
    }
};

exports.getSingleHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { paymentId } = req.params;

        if (!userId) {
            return res.status(404).json({
                success: false,
                message: "User ID not found",
            });
        };

        if (!isValidRazorpayOrderId(paymentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment id!',
            });
        };

        // Fetch history from both models based on userId and paymentId
        const [singleHistory, allHistory] = await Promise.all([
            SingleCategorySubscriptionModel.findOne({ userId, paymentId }).exec(),
            AllCategorySubscriptionModel.findOne({ userId, paymentId }).exec()
        ]);

        // If history is found in any model, return it
        const history = singleHistory || allHistory;

        if (!history) {
            return res.status(404).json({
                success: false,
                message: "No history found for the provided user and paymentId.",
            });
        };

        // Respond with the fetched history
        res.status(200).json({
            success: true,
            message: "History fetched successfully.",
            history,
        });

    } catch (error) {
        console.error('Error fetching history:', error);
        return res.status(500).json({
            success: false,
            message: "Error occurred while fetching the history.",
        });
    };
};
