const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const crypto = require('crypto');

const CategoryModel = require('../../models/adminModel/category.adminModel');
const Coupon = require('../../models/adminModel/coupan.adminModel');
const SubscriptionPlan = require('../../models/adminModel/subs.adminModel');

const SingleCategorySubscriptionModel = require('../../models/userModel/subs.user.Model');
const AllCategorySubscriptionModel = require('../../models/userModel/allSubs.userModel');

const { isValidRazorpayOrderId } = require('../../utils/subs.userUtil');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID_KEY,
    key_secret: process.env.RAZORPAY_SECRET_KEY
});

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
        if (categoryId.toLowerCase() !== 'all' && !mongoose.Types.ObjectId.isValid(categoryId)) {
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
                await Coupon.deleteOne({ _id: coupon._id });
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
        const [existingSingleSubscription, existingAllSubscription] = await Promise.all([
            SingleCategorySubscriptionModel.findOne({ userId }).exec(),
            AllCategorySubscriptionModel.findOne({ userId }).exec()
        ]);

        if (existingSingleSubscription || existingAllSubscription) {
            return res.status(409).json({
                success: false,
                message: 'Subscription already taken!',
            });
        };

        // Initialize discount values
        const discountFromPlan = subscriptionPlan.discount || 0;
        const discountFromCoupon = coupon ? coupon.discountPercentage : 0;

        const receipt = `receipt_${crypto.randomBytes(4).toString('hex')}_${Date.now()}`;

        const options = {
            amount: subscriptionPlan.price * 100, // Amount is in smallest currency unit, so convert to paise
            currency: 'INR',
            receipt,
            payment_capture: 1,
        };

        const order = await razorpay.orders.create(options);
        const payments = await razorpay.orders.fetchPayments(order.id);

        // Create the new subscription
        let newSubscription;
        if (categoryId.toLowerCase() === 'all') {
            newSubscription = new AllCategorySubscriptionModel({
                userId,
                categoryId,
                planName: subscriptionPlan.planName,
                planType: subscriptionPlan.planType,
                price: subscriptionPlan.price,
                paymentGetway: 'Razorpay',
                paymentMethod: payments.items?.[0]?.method || 'Unknown',
                paymentId: order.id,
                discountFromPlan,
                discountFromCoupon,
            });
        }
        else {
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
                price: subscriptionPlan.price,
                paymentGetway: 'Razorpay',
                paymentMethod: payments.items?.[0]?.method || 'Unknown',
                paymentId: order.id,
                discountFromPlan,
                discountFromCoupon,
            });
        };

        // Calculate final price and save subscription
        newSubscription.calculateFinalPrice();
        await newSubscription.save();

        const responseObj = {
            success: true,
            message: `Successfully subscribed to ${categoryId.toLowerCase() === 'all' ? 'all categories' : 'the selected category'}.`,
            orderId: order.id,
            currency: order.currency,
            receipt: order.receipt,
            userId: newSubscription.userId,
            categoryId: newSubscription.categoryId,
            planName: newSubscription.planName,
            planType: newSubscription.planType,
            price: `₹${newSubscription.price}`,
            discountFromPlan: `${newSubscription.discountFromPlan}%`,
            discountFromCoupon: `${newSubscription.discountFromCoupon}%`,
            finalPrice: `₹${newSubscription.finalPrice}`,
            paymentId: newSubscription.paymentId,
            paymentStatus: newSubscription.paymentStatus,
            status: newSubscription.status,
            startDate: newSubscription.startDate,
            expiryDate: newSubscription.expiryDate,
        };

        res.status(201).json(responseObj);

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

        if (error.code === 11000) {
            return res.status(409).json({
                success: true,
                message: 'Subscription already taken!',
            });
        };

        res.status(500).json({
            success: false,
            message: 'Error occurred while creating the subscription',
            error,
        });
    };
};

exports.updateSubscriptionStatus = async (req, res) => {
    try {
        const { paymentStatus } = req.body;
        const userId = req.user._id;

        // Find subscription in both models
        const existingSubscription = await Promise.any([
            SingleCategorySubscriptionModel.findOne({ userId }),
            AllCategorySubscriptionModel.findOne({ userId }),
        ]);

        if (existingSubscription.paymentStatus === "completed") {
            return res.status(409).json({
                success: false,
                message: 'already updated!',
                existingSubscription,
            });
        }

        // If subscription found, update its payment status
        if (existingSubscription) {
            existingSubscription.paymentStatus = paymentStatus || 'completed';
            await existingSubscription.save();
            return res.status(200).json({
                success: true,
                message: 'Subscription status updated successfully...',
                subscription: existingSubscription,
            });
        }

        // If no subscription found
        return res.status(404).json({
            success: false,
            message: 'Subscription not found!',
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
        const userId = req.user?._id;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID not found",
            });
        }

        const [singleSubscriptions, allSubscriptions] = await Promise.all([
            SingleCategorySubscriptionModel.find({ userId }),
            AllCategorySubscriptionModel.find({ userId })
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
