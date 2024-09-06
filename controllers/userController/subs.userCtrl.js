const UserPayment = require('../../models/userModel/payment.userModel');
const categoryModel = require('../../models/adminModel/category.adminModel');
const Coupon = require('../../models/adminModel/coupan.adminModel');
const UserSubscriptionModel = require('../../models/userModel/subs.user.Model');
const SubscriptionPlan = require('../../models/adminModel/subs.adminModel');

exports.subscribeToCategory = async (req, res) => {
    try {
        const { categoryId, plan, discountPercentage = 0, couponCode } = req.body;

        const userId = req.user._id;
        if (!userId) {
            return res.status(404).json({
                success: false,
                message: 'User ID not found!',
            });
        };

        const category = await categoryModel.findById(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found',
            });
        };

        const existingSubscription = await UserSubscriptionModel.findOne({ userId, categoryId });
        if (existingSubscription) {
            return res.status(409).json({
                success: false,
                message: 'Subscription already taken!',
            });
        };

        const subscriptionPlan = await SubscriptionPlan.findOne({ plan });
        if (!subscriptionPlan) {
            return res.status(404).json({
                success: false,
                message: 'Subscription plan not found!',
            });
        };

        const originalPrice = subscriptionPlan.price;

        let discountFromPercentage = (originalPrice * discountPercentage) / 100;
        let totalDiscount = discountFromPercentage; 

        let discountFromCoupon = 0;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode });

            if (!coupon) {
                return res.status(404).json({
                    success: false,
                    message: 'Invalid coupon code.'
                });
            };

            if (coupon.isExpired()) {
                return res.status(400).json({
                    success: false,
                    message: 'Coupon has expired.'
                });
            };

            if (!coupon.isActive) {
                return res.status(400).json({
                    success: false,
                    message: 'Coupon is inactive.'
                });
            };

            discountFromCoupon = (originalPrice * coupon.discountPercentage) / 100;
            totalDiscount += discountFromCoupon;
        };

        const finalPrice = originalPrice - totalDiscount;

        const newSubscription = new UserSubscriptionModel({
            userId,
            categoryId,
            plan,
            totalPrice: originalPrice,
            discountedPrice: finalPrice,
        });
        await newSubscription.save();

        res.status(201).json({
            success: true,
            message: `Successfully subscribed to ${category.name} with a ${plan} plan!`,
            originalPrice: `₹${originalPrice}`,
            discountFromPercentage: `₹${discountFromPercentage}`,
            discountFromCoupon: `₹${discountFromCoupon}`,
            totalDiscount: `₹${totalDiscount}`,
            finalPrice: `₹${finalPrice}`,
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
        }
        res.status(500).json({
            success: false,
            message: 'Error occurred while creating the subscription',
        });
    };
};

exports.subscribeToCategories = async (req, res) => {
    try {
        const { plan, discountPercentage = 0, couponCode } = req.body;
        const userId = req.user._id;

        if (!userId) {
            return res.status(404).json({
                success: false,
                message: 'User ID not found!',
            });
        };

        const categories = await categoryModel.find({});
        if (!categories.length) {
            return res.status(404).json({
                success: false,
                message: 'No categories available!',
            });
        };

        const subscriptionPlans = await SubscriptionPlan.find(
            { plan: { $in: ['monthly', 'quarterly', 'yearly'] } },
            { plan: 1, price: 1 }
        );
        const priceMap = subscriptionPlans.reduce((acc, plan) => {
            acc[plan.plan] = plan.price;
            return acc;
        }, {});

        if (!priceMap[plan]) {
            return res.status(400).json({
                success: false,
                message: `Invalid plan: ${plan}`,
            });
        };

        let totalCost = 0;
        let subscriptions = [];

        let couponDiscount = 0;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode });

            if (!coupon) {
                return res.status(404).json({
                    success: false,
                    message: 'Invalid coupon code.'
                });
            };

            if (coupon.isExpired()) {
                return res.status(400).json({
                    success: false,
                    message: 'Coupon has expired.'
                });
            };

            if (!coupon.isActive) {
                return res.status(400).json({
                    success: false,
                    message: 'Coupon is inactive.'
                });
            };

            couponDiscount = coupon.discountPercentage;
        };

        for (let category of categories) {
            const existingSubscription = await UserSubscriptionModel.findOne(
                { userId, categoryId: category._id }
            );

            if (!existingSubscription) {
                let price = priceMap[plan];
                totalCost += price;

                subscriptions.push({
                    userId,
                    categoryId: category._id,
                    plan,
                    discountedPrice: price
                });
            };
        };

        if (!subscriptions.length) {
            return res.status(409).json({
                success: false,
                message: 'Subscription already teken!'
            });
        };

        const totalDiscountPercentage = discountPercentage + couponDiscount;
        const discountedTotal = totalCost - (totalCost * (totalDiscountPercentage / 100));

        for (let subscription of subscriptions) {
            subscription.discountedPrice -= (subscription.discountedPrice * (totalDiscountPercentage / 100));
            await new UserSubscriptionModel(subscription).save();
        };

        return res.status(200).json({
            success: true,
            message: `Successfully subscribed to all categories with a ${totalDiscountPercentage}% discount!`,
            totalCost: `₹${totalCost.toFixed(2)}`,
            discountedTotal: `₹${discountedTotal.toFixed(2)}`,
            subscriptions
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong!',
            error: error.message
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

