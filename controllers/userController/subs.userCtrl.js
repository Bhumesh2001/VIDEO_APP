const mongoose = require('mongoose');
const UserPayment = require('../../models/userModel/payment.userModel');
const CategoryModel = require('../../models/adminModel/category.adminModel');
const Coupon = require('../../models/adminModel/coupan.adminModel');

const SingleCategorySubscriptionModel = require('../../models/userModel/subs.user.Model');
const AllCategorySubscriptionModel = require('../../models/userModel/subsAll.userModle');

const SubscriptionPlan = require('../../models/adminModel/subs.adminModel');

exports.subscribeToCategoryOrAll = async (req, res) => {
    const { categoryId, planName, planType, discountPercentage = 5, couponCode } = req.body;

    try {
        const userId = req.user._id;
        if (!userId) {
            return res.status(404).json({
                success: false,
                message: 'User ID not found!',
            });
        };

        if (categoryId !== 'all' && categoryId !== 'All' && !mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format!',
            });
        };

        if (!categoryId || !planName || !planType) {
            return res.status(400).json({
                success: false,
                message: 'categoryId, planName, and planType are required!',
            });
        };

        const subscriptionPlan = await SubscriptionPlan.findOne({ planName });
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
            const coupon = await Coupon.findOne({ couponCode });

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

            if (coupon.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: 'Coupon is inactive.'
                });
            };

            discountFromCoupon = (originalPrice * coupon.discountPercentage) / 100;
            totalDiscount += discountFromCoupon;
        };

        const finalPrice = originalPrice - totalDiscount;

        const existingSingleSubscription = await SingleCategorySubscriptionModel.findOne({ userId }).exec();
        const existingAllSubscription = await AllCategorySubscriptionModel.findOne({ userId }).exec();

        if (existingSingleSubscription || existingAllSubscription) {
            if (existingAllSubscription) {
                return res.status(409).json({
                    success: false,
                    message: 'Subscription already taken!',
                });
            };

            if (existingSingleSubscription) {
                return res.status(409).json({
                    success: false,
                    message: 'Subscription already taken!',
                });
            };
        };

        let newSubscription;

        if (categoryId === 'all' || categoryId === 'All') {
            newSubscription = new AllCategorySubscriptionModel({
                userId,
                planName,
                planType,
                totalPrice: originalPrice,
                discountedPrice: finalPrice,
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
                planName,
                planType,
                totalPrice: originalPrice,
                discountedPrice: finalPrice,
            });
        };

        await newSubscription.save();

        res.status(201).json({
            success: true,
            message: `Successfully subscribed to ${categoryId === 'all' ? 'all categories' : 'the selected category'}.`,
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
            error,
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
