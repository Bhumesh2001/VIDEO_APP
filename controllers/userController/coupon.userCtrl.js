const mongoose = require('mongoose');

const Coupon = require('../../models/adminModel/coupan.adminModel');
const SubscriptionPlan = require('../../models/adminModel/subs.adminModel');

const SingleCategorySubscriptionModel = require('../../models/userModel/subs.user.Model');
const AllCategorySubscriptionModel = require('../../models/userModel/allSubs.userModel');

exports.getCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.aggregate([
            { $sample: { size: 1 } },
            {
                $project: {
                    couponCode: 1,
                    discountPercentage: 1,
                    expirationDate: 1,
                    maxUsage: 1,
                    usageCount: 1,
                    status: 1,
                }
            }
        ]);
        if (!coupon.length) {
            return res.status(404).json({
                success: false,
                message: 'coupon not found!',
            });
        };
        res.status(200).json({
            success: true,
            message: 'coupon fetched successfully...',
            coupon: coupon[0],
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: true,
            message: 'error occured while fetching the coupon',
        });
    };
};

exports.applyCoupon = async (req, res) => {
    try {
        const { couponCode, categoryId, planId } = req.body;

        const userId = req.user._id;
        if (!userId) {
            return res.status(404).json({
                success: false,
                message: 'User ID not found!',
            });
        };

        const coupon = await Coupon.findOne({
            couponCode,
            status: 'Active',
            expirationDate: { $gt: Date.now() }
        }).lean().exec();

        if (!coupon) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired coupon'
            });
        }

        // Validate category ID if not subscribing to 'all'
        if (categoryId.toLowerCase() !== 'all' && !mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category ID format!',
            });
        }

        if (!mongoose.Types.ObjectId.isValid(planId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid planId ID format!",
            })
        }

        // Fetch the subscription plan
        const subscriptionPlan = await SubscriptionPlan.findById(planId);
        if (!subscriptionPlan) {
            return res.status(404).json({
                success: false,
                message: 'Subscription plan not found!',
            });
        }

        const existingSubscriptions = await Promise.all([
            SingleCategorySubscriptionModel.findOne({
                userId,
                categoryId,
                planId,
                status: 'active'
            }).sort({ createdAt: -1 }).exec(),
            AllCategorySubscriptionModel.findOne({
                userId,
                categoryId,
                planId,
                status: 'active'
            }).sort({ createdAt: -1 }).exec()
        ]);

        // Combine and filter out null values, then sort by createdAt
        const existing = existingSubscriptions
            .filter(Boolean) // Remove null values
            .sort((a, b) => b.createdAt - a.createdAt)[0];

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found!',
            });
        }
        
        const subscription = existing;

        if (subscription.discountFromCoupon !== 0) {
            return res.status(400).json({
                success: false,
                message: "Coupon already applied!",
                discount: subscription.discountFromCoupon,
                finalPrice: subscription.finalPrice,
            })
        }

        const { finalPrice } = subscription;
        const discountAmount = (finalPrice * coupon.discountPercentage) / 100;

        subscription.discountFromCoupon = coupon.discountPercentage;
        subscription.finalPrice = finalPrice - discountAmount;

        // Save the updated subscription
        await subscription.save();

        return res.status(200).json({
            success: true,
            message: 'Coupon applied successfully.',
            discount: coupon.discountPercentage,
            finalPrice: subscription.finalPrice,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while applying the coupon.',
            error: error.message,
        });
    }
};
