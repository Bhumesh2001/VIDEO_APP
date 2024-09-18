const Razorpay = require('razorpay');
const mongoose = require('mongoose');

const CategoryModel = require('../../models/adminModel/category.adminModel');
const Coupon = require('../../models/adminModel/coupan.adminModel');
const SubscriptionPlan = require('../../models/adminModel/subs.adminModel');

const SingleCategorySubscriptionModel = require('../../models/userModel/subs.user.Model');
const AllCategorySubscriptionModel = require('../../models/userModel/allSubs.userModel');

const { isValidRazorpayPaymentId } = require('../../utils/subs.userUtil');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID_KEY,
    key_secret: process.env.RAZORPAY_SECRET_KEY
});

exports.subscribeToCategoryOrAll = async (req, res) => {
    const { categoryId, planId, couponCode, paymentGetway, paymentId, } = req.body;

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

        // Create the new subscription
        let newSubscription;
        if (categoryId === 'all' || categoryId === 'All') {
            newSubscription = new AllCategorySubscriptionModel({
                userId,
                planName: subscriptionPlan.planName,
                planType: subscriptionPlan.planType,
                totalPrice: subscriptionPlan.price,
                paymentGetway,
                paymentId,
                paymentStatus: 'completed',
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
                totalPrice: subscriptionPlan.price,
                paymentGetway,
                paymentId,
                paymentStatus: 'completed',
                discountFromPlan,
                discountFromCoupon,
            });
        };

        // Calculate final price and save subscription
        newSubscription.calculateFinalPrice();
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

        if (error.code === 1100) {
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

        const [SingleSubscriptions, AllSubscriptions] = await Promise.all([
            SingleCategorySubscriptionModel.find({ userId }).exec(),
            AllCategorySubscriptionModel.find({ userId }).exec()
        ]);

        if (SingleSubscriptions.length === 0 || AllSubscriptions.length === 0) {
            return res.status(404).json({
                success: true,
                message: "History not found!"
            });
        };
        res.status(200).json({
            success: true,
            message: "History fetched successfully...",
            History: [...SingleSubscriptions, ...AllSubscriptions],
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Error occured while fetching the History",
        });
    };
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
        
        if(!isValidRazorpayPaymentId(paymentId)){
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
        
        // fetch payments details from razor pay 
        const payment = await razorpay.payments.fetch(paymentId);

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
            history: {
                ...history,
                ...payment
            },
        });

    } catch (error) {
        console.error('Error fetching history:', error);
        return res.status(500).json({
            success: false,
            message: "Error occurred while fetching the history.",
        });
    };
};
