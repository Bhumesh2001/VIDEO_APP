const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const crypto = require('crypto');

const CategoryModel = require('../../models/adminModel/category.adminModel');
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

        if (!mongoose.Types.ObjectId.isValid(planId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid planId ID format!",
            })
        };

        // Fetch the subscription plan
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
                message: `You must select the All Access plan for all categories!`,
            });
        }

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
            SingleCategorySubscriptionModel.findOne({
                userId,
                paymentStatus: 'completed',
                status: 'active'
            }).exec(),
            AllCategorySubscriptionModel.findOne({
                userId,
                paymentStatus: 'completed',
                status: 'active'
            }).exec()
        ]);

        if (existingSingleSubscription || existingAllSubscription) {
            return res.status(409).json({
                success: false,
                message: 'Subscription already taken!',
            });
        };

        // Initialize discount values
        let totalPrice;
        const discountFromPlan = subscriptionPlan.discount || 0;
        let discountFromCoupon;

        const CouponApplication_ = await CouponApplication.findOne({ userId });
        if (CouponApplication_) {
            totalPrice = CouponApplication_.finalPrice;
            const findDiscount = await Coupon.findOne({ couponCode: CouponApplication_.couponCode });
            discountFromCoupon = findDiscount.discountPercentage;
        }

        const receipt = `receipt_${crypto.randomBytes(4).toString('hex')}_${Date.now()}`;
        const options = {
            amount: totalPrice ? totalPrice * 100 : subscriptionPlan.price * 100,
            currency: 'INR',
            receipt,
            payment_capture: 1,
        };

        const order = await razorpay.orders.create(options);

        // Create the new subscription
        let newSubscription;
        if (categoryId.toLowerCase() === 'all') {
            newSubscription = new AllCategorySubscriptionModel({
                userId,
                categoryId,
                planId,
                planName: subscriptionPlan.planName,
                planType: subscriptionPlan.planType,
                price: subscriptionPlan.price,
                paymentGetway: 'Razorpay',
                paymentId: order.id,
                discountFromPlan,
                discountFromCoupon: discountFromCoupon ? discountFromCoupon : 0,
                flatDiscount: subscriptionPlan.flatDiscount,
                finalPrice: totalPrice?.totalPrice
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
                planId,
                planName: subscriptionPlan.planName,
                planType: subscriptionPlan.planType,
                price: subscriptionPlan.price,
                paymentGetway: 'Razorpay',
                paymentId: order.id,
                discountFromPlan,
                discountFromCoupon: discountFromCoupon ? discountFromCoupon : 0,
                flatDiscount: subscriptionPlan.flatDiscount,
                finalPrice: totalPrice?.totalPrice
            });
        };

        // Calculate final price and save subscription
        newSubscription.calculateFinalPrice();
        await newSubscription.save();

        const responseObj = {
            success: true,
            message: `Successfully subscribed to ${categoryId.toLowerCase() === 'all' ? 'all categories' : 'the selected category'}.`,
            orderId: order.id,
            userId: newSubscription.userId,
            categoryId: newSubscription.categoryId,
            planId: newSubscription.planId,
            planName: newSubscription.planName,
            planType: newSubscription.planType,
            price: `₹${newSubscription.price}`,
            discountFromPlan: `${newSubscription.discountFromPlan}%`,
            discountFromCoupon: `${discountFromCoupon}%`,
            flatDiscount: `₹${newSubscription.flatDiscount ? newSubscription.flatDiscount : 0}`,
            finalPrice: `₹${newSubscription.finalPrice}`,
            paymentId: newSubscription.paymentId,
            paymentStatus: newSubscription.paymentStatus,
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
